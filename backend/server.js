const express = require('express'); //express import
const path = require('path'); //path import
const mongoose = require('mongoose'); //mongoose import
const bcrypt = require('bcryptjs'); //해싱처리 import
const session = require('express-session'); //express-session import
const crypto = require('crypto'); //crypto import
const axios = require('axios');
const { OpenAI } = require('openai');
const FormData = require('form-data');
require('dotenv').config(); //dotenv import 변수가 없는이유는 항시 사용이며 딱히 변수써서 할게없음

const app = express(); //express() 함수 사용

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

mongoose.connect(process.env.MONGODB_URI + '/capstone')
  .then(() => {
    console.log('MongoDB 연결 성공');
    console.log('실제 연결된 DB:', mongoose.connection.db.databaseName);
  })
  .catch(err => console.error('MongoDB 연결 실패:', err)); //데이터베이스 연결


const session_secret = crypto.randomBytes(64).toString('hex')

app.use(express.json()); //안하면 json 형식을 못알아먹음
app.use('/assets', express.static(path.join(__dirname, '..', 'frontend', 'assets'))); // /assets 들어오는 모든 요청을 ../frontend/assets 폴더에 있는 파일과 연결
app.use(session({
  secret: session_secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 1 * 60 * 60 * 1000 //유지 시간
  }
})); // 세션 설정

app.get('/', (req,res) =>{
    res.sendFile(path.join(__dirname,'..','frontend','html','flowermain.html'))
}); // flowermain.html
app.get('/login',(req,res) =>{
    res.sendFile(path.join(__dirname,'..','frontend','html','login.html'))
}); // login.html
app.get('/sign',(req,res) =>{
    res.sendFile(path.join(__dirname,'..','frontend','html','signup.html'))
}); //signup.html
app.get('/main',(req,res)=>{
    res.sendFile(path.join(__dirname,'..','frontend','html','flowermain_login.html'))
}); //flowermain_login.html
app.get('/mypage',(req,res)=>{
    res.sendFile(path.join(__dirname,'..','frontend','html','mypage.html'))
});
app.get('/image',(req,res)=>{
    res.sendFile(path.join(__dirname,'..','frontend','html','image.html'))
});
app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'html', 'gallery.html'));
});//gallery.html
app.get('/result', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'html', 'resultPage.html'));
});//gallery.html


// 사용자 스키마 및 모델 정의
const userSchema = new mongoose.Schema({
userid: { type: String, required: true, unique: true },
email: { type: String, required: true, unique: true },
password: { type: String, required: true },
name: { type: String, required: true },
age: { type: Number, required: true },
createdAt: { type: Date, default: Date.now }
});

// const User = mongoose.model('User', userSchema, 'users');

// 비밀번호 해싱
userSchema.pre('save', async function (next) {
if (!this.isModified('password')) return next();

try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
} catch (error) {
    next(error);
}
});

// 비밀번호 검증 메서드
userSchema.methods.comparePassword = async function (candidatePassword) {
return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema, 'users');

// 이미지 스키마 (Lambda에서 생성된 이미지들)
const imageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  backgroundType: { type: String, required: true },
  flowerName: { type: [String], required: true },
  flowerColor: { type: [String], required: true },
  flowerSeason: { type: [String], required: false },
  imageUrl: { type: String, required: true },
  likeCount: { type: Number, default: 0 } // 좋아요 개수
});

const Image = mongoose.model('Image', imageSchema, 'images'); // 컬렉션명 명시

// 좋아요 스키마
const likeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  imageId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Image' },
  createdAt: { type: Date, default: Date.now }
});

// 사용자가 같은 이미지에 중복 좋아요 방지
likeSchema.index({ userId: 1, imageId: 1 }, { unique: true });

const Like = mongoose.model('Like', likeSchema, 'likes'); // 컬렉션명 명시

app.post('/register', async(req, res) =>{
    try{
        const { userid, email, password, name, age } = req.body;
        
        console.log('받은 데이터:', { userid, email, name, age }); // 디버깅
        
        const existingUser = await User.findOne({ $or: [{ userid }, { email }] });
        console.log('기존 사용자 검색 결과:', existingUser); // 디버깅
        
        if (existingUser) {
            console.log('중복된 필드:', existingUser.userid === userid ? 'userid' : 'email'); // 디버깅
            return res.status(400).json({ message: '이미 존재하는 사용자명 또는 이메일입니다.' });
        }
        
        const newUser = new User({ userid, email, password, name, age });
        await newUser.save();
        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
        
    }catch (error) {
        console.error('회원가입 에러:', error); // 여기서 실제 오류 확인
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
}); // 회원가입 로직

app.post('/login',async(req,res)=>{
    try{
        const { userid, password } = req.body;

        const user = await User.findOne({ userid });
        if(!user){
            return res.status(400).json({ success: false, message: '사용자명이 일치하지 않습니다.' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid){
            return res.status(400).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
        } 
        req.session.userId = user._id;
        res.json({ success: true, message: '로그인 성공!' });
    }catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: '서버 오류', error: error.message });
    }
}); //로그인

// 마이페이지 정보 불러오기
app.get('/me', async(req,res)=>{
    try{
        if (!req.session.userId){
            return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        } 

        const user = await User.findById(req.session.userId).select('name userid email');
        if (!user){
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }
        else{
            res.json({ success: true, data: user });
        }
    }catch(error){
        console.log(error)
        res.status(500).json({ success: false, message: '서버 오류', error: err.message });
    }
}); 

// 로그아웃
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: '로그아웃 실패' });
    res.clearCookie('connect.sid');
    res.status(200).json({ success: true, message: '로그아웃 성공' });
  });
});

// 비밀번호 변경(현재 비밀번호 입력하지 않음)
app.post('/update-password', async (req, res) => {
  const { newPassword } = req.body;
  
  // 입력값 검증 추가
  if (!newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: '새 비밀번호를 입력해주세요.' 
    });
  }
  
  if (newPassword.length < 4) {
    return res.status(400).json({ 
      success: false, 
      message: '새 비밀번호는 4자 이상이어야 합니다.' 
    });
  }
  
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });

    // const isMatch = await user.comparePassword(currentPassword);
    // if (!isMatch) return res.status(400).json({ success: false, message: '현재 비밀번호가 일치하지 않습니다.' });

    user.password = newPassword; // pre('save') 훅이 자동으로 해싱해줌
    await user.save();

    res.json({ success: true, message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류', error: err.message });
  }
});

// 회원 탈퇴
app.get('/delete', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인한 사용자만 탈퇴할 수 있습니다.' });
  }

  try {
    await User.deleteOne({ _id: userId });

    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ success: true, message: '탈퇴는 되었으나 로그아웃에 실패했습니다.' });
      }

      res.clearCookie('connect.sid');
      return res.status(200).json({ success: true, message: '회원 탈퇴가 완료되었습니다.' });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '서버 오류로 탈퇴에 실패했습니다.' });
  }
});

// 로그인이 되어 있는지 확인
app.get('/check-login', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});

//꽃 정보 스키마
const flowerSchema = new mongoose.Schema({
  name: { type: String, required: true },             // 꽃 이름
  meaning: { type: String, required: true },          // 꽃말
  description: { type: String, required: true },      // 꽃에 대한 설명
  season: { type: String, required: true },           // 관련 계절 (예: '봄', '여름', '가을', '겨울')
  representative_imageurl: {type: String, required: true},   // 대표적인 꽃 이미지 url
  variations: {
    color: String,                                 // 꽃의 색상
    imageurl: String                               // 꽃 색상별 이미지 url
  }           
});

const Flower = mongoose.model('Flower', flowerSchema, 'flower-info');  //꽃 정보 컬렉션

//오늘 띄울 꽃 정보 스키마
const todayFlowerSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, 
  flower: {
    name: String,
    meaning: String,
    representative_imageurl: String,
    description: String
  }
});

const TodayFlower = mongoose.model('TodayFlower', todayFlowerSchema);  //오늘의 꽃 정보 컬렉션(하루에 하나의 꽃만 보여주기 위해)

// 🌸 꽃 이름 리스트 API
app.get('/flowers', async (req, res) => {
  try {
    const flowers = await Flower.find({}, 'name');
    const names = flowers.map(f => f.name);
    res.json(names);
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류', error: err.message });
  }
});

// 🌼 꽃 검색 API: 조건에 맞는 이미지 URL 반환
app.post('/search-flowers', async (req, res) => {
  const { name, season, colors } = req.body;

  const query = {};
  if (name) query.name = { $regex: name, $options: 'i' };
  if (season) query.season = season;
  if (colors && colors.length > 0) {
    query['variations.color'] = { $in: colors };
  }

  try {
    const flowers = await Flower.find(query);
    res.json(flowers);
  } catch (error) {
    res.status(500).json({ success: false, message: '검색 실패', error: error.message });
  }
});

// 오늘의 꽃말 라우트
app.get('/today-flower', async (req, res) => {
  try {
    const now = new Date();
    now.setHours(now.getHours() + 9);
    const today = now.toISOString().split('T')[0]; // 예: '2025-05-18'

    // 오늘 날짜로 캐시된 꽃 조회
    let cached = await TodayFlower.findOne({ date: today });

    if (cached) {
      return res.json(cached.flower);
    }

    // 랜덤 꽃 선택
    const random = await Flower.aggregate([
      { $sample: { size: 1 } },
      {
        $project: {
          name: 1,
          meaning: 1,
          representative_imageurl: 1,
          description: 1
        }
      }
    ]);

    // 캐시에 저장 (upsert 가능)
    const todayFlower = await TodayFlower.findOneAndUpdate(
      { date: today },
      {
        date: today,
        flower: {
          name: random[0].name,
          meaning: random[0].meaning,
          representative_imageurl: random[0].representative_imageurl,
          description: random[0].description
        }
      },
      { new: true, upsert: true }
    );

    return res.json(todayFlower.flower);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});


const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

app.get('/download-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send("URL 없음");

  try {
    const response = await fetch(imageUrl);
    const contentType = response.headers.get('content-type');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment; filename=flower.png');
    res.send(buffer);
  } catch (error) {
    console.error('이미지 다운로드 실패:', error);
    res.status(500).send("다운로드 실패");
  }
});


// =========================
// 갤러리 관련 API들
// =========================

//프론트엔드에서 전달된 month, color, type을 기반으로 MongoDB에서 해당 조건을 만족하는 데이터를 찾아주는 역할
const buildFilterQuery = (req) => {
  const { month, color, type } = req.query;
  const query = {};

  // 월 필터 (ex: '5월' → 5)
  if (month && month !== '전체 월') {
    const monthNumber = parseInt(month.replace('월', ''));
    query.$expr = { $eq: [{ $month: "$createdAt" }, monthNumber] };
  }

  // 색상 필터
  if (color && color !== '전체색깔') {
    query.flowerColor = color;
  }

  // 타입 필터 (배경 종류)
  if (type && type !== '전체타입') {
    query.backgroundType = type;
  }

  return query;
};

// 내 이미지 조회 (개인 보관함)
app.get('/my-images', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const filter = buildFilterQuery(req);
    const baseQuery = { userId: req.session.userId, ...filter };

    const images = await Image.find(baseQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name userid');

    const total = await Image.countDocuments(baseQuery);

    res.json({
      success: true,
      data: images,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalImages: total,
        hasMore: skip + images.length < total
      }
    });
  } catch (error) {
    console.error('내 이미지 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류', error: error.message });
  }
});

// 전체 이미지 조회 (모든 사용자의 보관함)
app.get('/all-images', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    // 필터 쿼리 생성
    const filter = buildFilterQuery(req);

    const images = await Image.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name userid');

    const total = await Image.countDocuments(filter);

    res.json({
      success: true,
      data: images,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalImages: total,
        hasMore: skip + images.length < total
      }
    });
  } catch (error) {
    console.error('전체 이미지 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류', error: error.message });
  }
});

// 좋아요한 이미지 조회
app.get('/liked-images', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    // 1. 사용자가 좋아요한 모든 imageId 조회 (페이징 전)
    const likedImageIdsDocs = await Like.find({ userId: req.session.userId }).select('imageId');
    const likedImageIds = likedImageIdsDocs.map(doc => doc.imageId);

    // 필터 쿼리 생성
    const filter = buildFilterQuery(req);

    // 2. 필터 조건과 좋아요한 이미지 ID를 함께 사용하여 Image 조회
    // (좋아요한 이미지 중 필터 조건에 맞는 것만 조회)
    const query = {
      _id: { $in: likedImageIds },
      ...filter
    };

    // 전체 필터 적용된 좋아요 이미지 개수
    const total = await Image.countDocuments(query);

    // 3. 필터링된 이미지 페이징 조회
    const images = await Image.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name userid');

    res.json({
      success: true,
      data: images,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalImages: total,
        hasMore: skip + images.length < total
      }
    });

  } catch (error) {
    console.error('좋아요한 이미지 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류', error: error.message });
  }
});

// 좋아요 추가/제거
app.post('/toggle-like', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    const { imageId } = req.body;
    
    if (!imageId) {
      return res.status(400).json({ success: false, message: '이미지 ID가 필요합니다.' });
    }

    // 이미지가 존재하는지 확인
    const image = await Image.findById(imageId);
    if (!image) {
      return res.status(404).json({ success: false, message: '이미지를 찾을 수 없습니다.' });
    }

    // 이미 좋아요했는지 확인
    const existingLike = await Like.findOne({ 
      userId: req.session.userId, 
      imageId: imageId 
    });

    if (existingLike) {
      // 좋아요 제거
      await Like.deleteOne({ _id: existingLike._id });
      // 이미지의 좋아요 개수 감소
      await Image.findByIdAndUpdate(imageId, { $inc: { likeCount: -1 } });
      
      res.json({ success: true, liked: false, message: '좋아요를 취소했습니다.' });
    } else {
      // 좋아요 추가
      const newLike = new Like({
        userId: req.session.userId,
        imageId: imageId
      });
      await newLike.save();
      
      // 이미지의 좋아요 개수 증가
      await Image.findByIdAndUpdate(imageId, { $inc: { likeCount: 1 } });
      
      res.json({ success: true, liked: true, message: '좋아요를 추가했습니다.' });
    }
  } catch (error) {
    console.error('좋아요 토글 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류', error: error.message });
  }
});

// 사용자의 좋아요 상태 확인 (여러 이미지 동시 확인)
app.post('/check-likes', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: true, likes: {} });
    }

    const { imageIds } = req.body;
    
    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ success: false, message: 'imageIds는 배열이어야 합니다.' });
    }

    const likes = await Like.find({
      userId: req.session.userId,
      imageId: { $in: imageIds }
    });

    const likeStatus = {};
    imageIds.forEach(id => {
      likeStatus[id] = likes.some(like => like.imageId.toString() === id);
    });

    res.json({ success: true, likes: likeStatus });
  } catch (error) {
    console.error('좋아요 상태 확인 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류', error: error.message });
  }
});

// 이미지 삭제 (자신의 이미지만)
// 서버 사이드 - 이미지 삭제 API (Lambda 연동)
app.delete('/delete-image/:imageId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    const { imageId } = req.params;

    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ success: false, message: '잘못된 이미지 ID입니다.' });
    }

    // 자신의 이미지인지 확인
    const image = await Image.findOne({
      _id: imageId,
      userId: req.session.userId
    });

    if (!image) {
      return res.status(404).json({ success: false, message: '이미지를 찾을 수 없거나 삭제 권한이 없습니다.' });
    }

    // AWS Lambda 호출
    const lambdaResponse = await fetch('https://ekulip1jhd.execute-api.ap-northeast-2.amazonaws.com/default/delimage', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    imageId: imageId,
    userId: req.session.userId,
    imageUrl: image.imageUrl
  })
});

if (!lambdaResponse.ok) {
  return res.status(500).json({
    success: false,
    message: 'Lambda 함수 호출 실패',
    // error: lambdaText
  });
}

const lambdaData = await lambdaResponse.json();

    if (lambdaData.success) {
      res.json({ success: true, message: '이미지가 삭제되었습니다.' });
    } else {
      res.status(500).json({
        success: false,
        message: lambdaData.error || '이미지 삭제 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('이미지 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 인기 이미지 3개 가져오기
app.get('/top3', async (req, res) => {
  try {
    const topImages = await Image.find({})   //images 컬렉션의 모든 정보를 가져옴
      .sort({ likeCount: -1, createdAt: -1}) // 좋아요 순으로 먼저 정렬을 하고 최근에 생성된 기준으로 정렬
      .limit(3);                             // 정렬되어 있는 이미지 3개를 가져옴

    res.json(topImages);
  } catch (err) {
    res.status(500).json({ message: '서버 에러 발생' });
  }
});

const flowerData = {
  "백합": {
    name: "백합",
    season: "여름",
    meaning: "순결, 깨끗한 마음",
    description: "백합은 우리말로 나리입니다. 꽃꽂이용으로 흔히 쓰이지만 정원용으로 화단 한 곳에 색깔별로 무리지어 심어 두면 빨리 피는 것부터 시작하여 6월 중순부터 8월 초까지 꽃을 볼수 있습니다."
  },
  "장미": {
    name: "장미",
    season: "여름",
    meaning: "열렬한 사랑, 질투, 순결",
    description: "전세계 사람들이 가장 선호하는 꽃입니다. 신화속의 비너스 여신으로부터 지금에 이르기까지 '사랑' 이야기에는 빠지지 않고 등장하는 꽃이기도 합니다. 최근에 개발되는 품종들은 절화용(꽃다발, 꽃꽃이)이나 분화용(화분) 품종들이 주류를 이루고 있습니다."
  },
  "튤립": {
    name: "튤립",
    season: "봄",
    meaning: "열렬한 사랑, 질투, 순결",
    description: "전세계 사람들이 가장 선호하는 꽃입니다. 신화속의 비너스 여신으로부터 지금에 이르기까지 '사랑' 이야기에는 빠지지 않고 등장하는 꽃이기도 합니다. 최근에 개발되는 품종들은 절화용(꽃다발, 꽃꽃이)이나 분화용(화분) 품종들이 주류를 이루고 있습니다."
  },
  "안개꽃": {
    name: "안개꽃",
    season: "봄",
    meaning: "맑은 마음, 순수한 사랑, 사랑의 성공",
    description: "많은 잔가지에 피어있는 작은 송이의 꽃들이 안개가 내려앉은 듯 하다 하여 안개꽃이라는 이름이 붙여졌습니다. 관상용, 선물용으로 많이 쓰이며 꽃꽂이에서도 자주 쓰입니다."
  },
  "데이지": {
    name: "데이지",
    season: "봄",
    meaning: "겸손함, 아름다움, 희망, 평화",
    description: "영국 사람들은 낮에 꽃이 피고 밤에 꽃잎이 닫는 모습을 Day's eye라 하는데 데이지는 여기서 유래된 명칭입니다. 보통 데이지라고 하면 잉글리쉬데이지를 말하며 주로 봄철 화단용으로 쓰이지만 요즘은 분화(꽃다발, 꽃꽃이)로도 이용됩니다."
  },
  "국화": {
    name: "국화",
    season: "가을",
    meaning: "청결, 정조, 순결",
    description: "꽃의 주류를 이루고 있을 만큼 널리 이용되는 식물입니다. 가장 많게 쓰이는 데는 꽃꽂이며, 다음이 화단용입니다. 동아시아에서는 장례식에서 많이 쓰이고 있으며 차로도 사용됩니다."
  },
  "라넌큘러스": {
    name: "라넌큘러스",
    season: "봄",
    meaning: "비난, 화사한 매력",
    description: "향기는 없으며, 꽃잎이 많아 무겁기 때문에 꽃대가 부러지기 쉬우니 말릴때 주의해야 한다는 점에서 초보자가 키우기에는 어려울 수 있는 꽃입니다. 웨딩 부케로도 쓰이며 꽃다발에도 자주 포함되며 인기가 높습니다."
  },
  "아네모네": {
    name: "아네모네",
    season: "봄",
    meaning: "고독, 정조, 성실",
    description: "아네모네라는 이름은 '바람'을 뜻하는 그리스에서 왔습니다. 키가 작은 편으로 화단이나 분화용(화분)으로 쓰입니다. 최근에는 꽃꽂이용으로도 생산되고 있다고 합니다."
  },
  "리시안셔스": {
    name: "리시안셔스",
    season: "여름",
    meaning: "변치 않는 사랑, 우아함, 아름다움",
    description: "북아메리카가 원산지로 우리나라에서는 꽃도라지로도 불립니다. ‘변치 않는 사랑,’ ‘아름다움’ 등의 꽃말을 갖고 있어 결혼식의 신부 부케로 많이 활용되고 있습니다."
  }
};

// 꽃 데이터 검색 함수
function findFlowerData(question) {
  const questionLower = question.toLowerCase();
  
  for (const [key, data] of Object.entries(flowerData)) {
    if (questionLower.includes(key.toLowerCase()) || 
        questionLower.includes(data.name.toLowerCase())) {
      return data;
    }
  }
  return null;
}

// 꽃 정보 포맷팅 함수
function formatFlowerInfo(flowerData) {
  let formatted = `**${flowerData.name}**에 대한 정보입니다.\n\n`;
  formatted += `• 계절: ${flowerData.season}\n`;
  formatted += `• 의미: ${flowerData.meaning}\n`;
  formatted += `• 설명: ${flowerData.description}`;
  return formatted;
}

// 챗봇 API 엔드포인트
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    // 꽃 데이터에서 관련 정보 찾기
    const flowerInfo = findFlowerData(message);
    
    if (!flowerInfo) {
      return res.json({ 
        response: "죄송합니다. 해당 꽃에 대한 정보는 아직 준비되어 있지 않습니다. 대신 백합, 장미, 튤립 등 주요 꽃들에 대한 정보를 확인하실 수 있어요."
      });
    }

    // OpenAI를 사용해 자연스러운 답변 생성
    const dataContext = formatFlowerInfo(flowerInfo);
    const prompt = `
당신은 제공된 꽃 데이터베이스의 정보만을 사용해서 답변하는 친근한 꽃 정보 도우미입니다.
아래 데이터에 있는 내용만으로 답변하고, 데이터에 없는 추가 정보는 절대 포함하지 마세요.

데이터:
${dataContext}

사용자 질문: ${message}

위 데이터에 기반해서만 친근하고 자연스럽게 답변해주세요.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 제공된 데이터만을 사용해서 답변하는 친근한 꽃 정보 도우미입니다."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const response = completion.choices[0].message.content.trim();
    res.json({ response });

  } catch (error) {
    console.error('챗봇 오류:', error);
    res.status(500).json({ 
      error: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
    });
  }
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
/*
app.listen(process.env.PORT,() =>{
    console.log(`서버가 http://${process.env.IP}:${process.env.PORT} 에서 실행 중입니다.`)
}); //서버 열기
*/