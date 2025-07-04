// ===== 람다 함수 - 이미지 삭제 =====

const AWS = require('aws-sdk');
const mongoose = require('mongoose');

// AWS S3 설정
const s3 = new AWS.S3({
    region: 'ap-northeast-2'
});

// 환경변수 체크
if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI 환경변수가 설정되지 않았습니다.');
    throw new Error('MONGODB_URI 환경변수가 필요합니다.');
}

// MongoDB 스키마 정의 (기존과 동일)
const imageSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, required: true},
    userName: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
    backgroundType: {type: String, required: true},
    flowerName: {type: [String], required: true},
    flowerColor: {type: [String], required: true},
    flowerSeason: {type: [String], required: false},
    imageUrl: {type: String, required: true}
});

const likeSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, required: true},
    imageId: {type: mongoose.Schema.Types.ObjectId, required: true},
    createdAt: {type: Date, default: Date.now}
});

// MongoDB 연결 상태 관리
let cachedDb = null;
let ImageModel = null;
let LikeModel = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return { db: cachedDb, ImageModel, LikeModel };
    }

    try {
        console.log('MongoDB 연결 시도...');
        console.log('MongoDB URI 존재 여부:', !!process.env.MONGODB_URI);
        
        const connection = await mongoose.connect(process.env.MONGODB_URI);
        
        cachedDb = connection.connection.db;
        
        // 모델이 이미 등록되어 있는지 확인
        if (!ImageModel) {
            ImageModel = mongoose.model('Image', imageSchema);
        }
        if (!LikeModel) {
            LikeModel = mongoose.model('Like', likeSchema);
        }
        
        console.log('MongoDB 연결 성공');
        return { db: cachedDb, ImageModel, LikeModel };
    } catch (error) {
        console.error('MongoDB 연결 실패:', error);
        throw error;
    }
}

// S3 URL에서 키 추출하는 함수
function extractS3KeyFromUrl(s3Url) {
    try {
        console.log('원본 S3 URL:', s3Url);
        
        // S3 URL 형식들:
        // https://capstone-mogumogu-s3.s3.ap-northeast-2.amazonaws.com/images/generated-flowers/filename.png
        // https://s3.ap-northeast-2.amazonaws.com/capstone-mogumogu-s3/images/generated-flowers/filename.png
        const url = new URL(s3Url);
        
        let s3Key;
        
        if (url.hostname.includes('capstone-mogumogu-s3.s3.')) {
            // https://capstone-mogumogu-s3.s3.ap-northeast-2.amazonaws.com/images/generated-flowers/filename.png 형식
            s3Key = decodeURIComponent(url.pathname.substring(1)); // 맨 앞의 '/' 제거
        } else if (url.hostname.includes('s3.') && url.pathname.includes('/capstone-mogumogu-s3/')) {
            // https://s3.ap-northeast-2.amazonaws.com/capstone-mogumogu-s3/images/generated-flowers/filename.png 형식
            const pathParts = url.pathname.split('/');
            const bucketIndex = pathParts.indexOf('capstone-mogumogu-s3');
            if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                s3Key = pathParts.slice(bucketIndex + 1).join('/');
            }
        }
        
        if (!s3Key) {
            throw new Error('S3 키를 추출할 수 없는 URL 형식입니다.');
        }
        
        // images/generated-flowers/ 경로 확인
        if (!s3Key.startsWith('images/generated-flowers/')) {
            console.warn('예상과 다른 S3 경로:', s3Key);
        }
        
        console.log('추출된 S3 키:', s3Key);
        return s3Key;
        
    } catch (error) {
        console.error('S3 키 추출 오류:', error);
        console.error('문제가 된 URL:', s3Url);
        throw new Error(`S3 URL에서 키를 추출할 수 없습니다: ${error.message}`);
    }
}

exports.handler = async (event) => {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    let dbConnection = null;

    try {
        // MongoDB 연결
        dbConnection = await connectToDatabase();
        const { ImageModel, LikeModel } = dbConnection;

        // 요청 데이터 파싱
        const { imageId, userId, imageUrl } = JSON.parse(event.body);
        console.log("이미지 삭제 요청 데이터:", { imageId, userId, imageUrl });

        // 필수 데이터 유효성 검사
        if (!imageId || !userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'imageId와 userId가 필요합니다.' 
                })
            };
        }

        // ObjectId 유효성 검사
        if (!mongoose.Types.ObjectId.isValid(imageId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: '잘못된 ID 형식입니다.' 
                })
            };
        }

        // MongoDB 트랜잭션 시작
        const session = await mongoose.startSession();

        let s3DeletePromise = null;

        try {
            // 1. DB에서 이미지 정보 먼저 찾기 (트랜잭션 외부)
            const image = await ImageModel.findOne({
                _id: new mongoose.Types.ObjectId(imageId),
                userId: new mongoose.Types.ObjectId(userId)
            });

            if (!image) {
                throw new Error('이미지를 찾을 수 없거나 삭제 권한이 없습니다.');
            }

            console.log('삭제할 이미지 정보:', {
                id: image._id,
                url: image.imageUrl,
                flowerNames: image.flowerName
            });

            // 2. S3 삭제 비동기로 먼저 준비 (await 하지 않음)
            if (image.imageUrl) {
                try {
                    const s3Key = extractS3KeyFromUrl(image.imageUrl);
                    console.log('삭제할 S3 키:', s3Key);

                    if (!s3Key.startsWith('images/generated-flowers/')) {
                        console.warn(`예상과 다른 경로의 이미지입니다: ${s3Key}`);
                    }

                    const deleteParams = {
                        Bucket: 'capstone-mogumogu-s3',
                        Key: s3Key
                    };

                    console.log('S3 삭제 요청 파라미터:', deleteParams);

                    // 비동기 삭제 시작
                    s3DeletePromise = s3.deleteObject(deleteParams).promise();
                } catch (s3PrepareError) {
                    console.error('S3 삭제 준비 중 오류:', s3PrepareError);
                    // 삭제 실패해도 DB 삭제는 계속 진행
                }
            } else {
                console.warn('이미지 URL이 없습니다, DB 삭제만 진행');
            }

            // 3. 트랜잭션으로 MongoDB 처리
            await session.withTransaction(async () => {
                // 관련 좋아요 삭제
                const deletedLikes = await LikeModel.deleteMany({
                    imageId: new mongoose.Types.ObjectId(imageId)
                }).session(session);

                console.log(`관련 좋아요 ${deletedLikes.deletedCount}개 삭제됨`);

                // 이미지 레코드 삭제
                const deletedImage = await ImageModel.deleteOne({
                    _id: new mongoose.Types.ObjectId(imageId)
                }).session(session);

                console.log('MongoDB 이미지 레코드 삭제 완료:', deletedImage);

                if (deletedImage.deletedCount === 0) {
                    throw new Error('이미지 삭제에 실패했습니다.');
                }
            });

            console.log('이미지 삭제 트랜잭션 완료');

            // 4. 트랜잭션 이후에 S3 삭제 기다리기
            if (s3DeletePromise) {
                try {
                    const deleteResult = await s3DeletePromise;
                    console.log('S3 이미지 삭제 완료:', deleteResult);
                } catch (s3FinalError) {
                    console.error('S3 삭제 실패:', s3FinalError.message);
                }
            }

            return {
                statusCode: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*', // CORS 허용 (필요 시)
                },
                body: JSON.stringify({
                  success: true,
                  message: '이미지가 성공적으로 삭제되었습니다.',
                  deletedImageId: imageId
                })
              };

        } finally {
            await session.endSession();
        }

    } catch (error) {
        console.error("이미지 삭제 프로세스 오류:", error);
        
        // 에러 타입에 따른 상태 코드 설정
        let statusCode = 500;
        if (error.message.includes('찾을 수 없거나') || error.message.includes('권한이 없습니다')) {
            statusCode = 404;
        } else if (error.message.includes('잘못된') || error.message.includes('필요합니다')) {
            statusCode = 400;
        }

        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: error.message || '이미지 삭제 중 오류가 발생했습니다.',
                details: error.stack 
            })
        };
    }
    // Lambda에서는 DB 연결을 명시적으로 닫지 않음 (재사용을 위해)
};

