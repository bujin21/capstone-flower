document.addEventListener('DOMContentLoaded', () => {
            const resultContainer = document.getElementById('resultContainer');
            
            // sessionStorage에서 결과 데이터 가져오기
            const resultDataStr = sessionStorage.getItem('generatedImageResult');
            
            if (!resultDataStr) {
                resultContainer.innerHTML = `
                    <div class="error">
                        <h2>오류가 발생했습니다</h2>
                        <p>생성된 이미지 데이터를 찾을 수 없습니다.</p>
                        <a href="/image" class="btn btn-primary">다시 생성하기</a>
                    </div>
                `;
                return;
            }
            
            try {
                const resultData = JSON.parse(resultDataStr);
                console.log('결과 데이터:', resultData);
                
                // 꽃 정보 HTML 생성
                let flowerInfoHtml = '';
                if (resultData.flowerSets && resultData.flowerSets.length > 0) {
                    flowerInfoHtml = `
                        <div class="flower-info">
                            <h3>사용된 꽃 정보</h3>
                            ${resultData.flowerSets.map((set, index) => `
                                <div class="flower-set">
                                    <strong>세트 ${index + 1}:</strong> ${set.name} (${set.color}${set.season ? `, ${set.season}` : ''})
                                </div>
                            `).join('')}
                            <div style="margin-top: 1rem;">
                                <strong>구성 형태:</strong> ${resultData.backgroundType || ''}
                            </div>
                        </div>
                    `;
                }
                
                // 결과 HTML 생성
                resultContainer.innerHTML = `
                    <div class="success-message">
                        이미지가 생성되었습니다.<br>
                        원하시는 결과가 나왔나요?
                    </div>

                    <!-- 생성된 이미지들 -->
                    <div class="image-gallery">
                        <div class="image-item">
                            <img src="${resultData.image}" alt="생성된 꽃 이미지" class="generated-image" />
                        </div>
                    </div>

                    ${flowerInfoHtml}

                    <!-- 액션 버튼들 -->
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="downloadImage()">
                            <i class="bi bi-download"></i>
                            이미지 다운로드
                        </button>
                        <button class="btn btn-secondary" onclick="goToGallery()">
                            <i class="bi bi-archive-fill"></i>
                            보관함으로 이동
                        </button>
                    </div>
                    
                    <!-- 추가 액션 -->
                    <div class="additional-actions">
                        <a href="/image" class="btn btn-outline">
                            <i class="bi bi-arrow-clockwise"></i>
                            꽃 선택 다시하기
                        </a>
                        <!-- 카드 전송 버튼 추가 (공유하기 대체) -->
                        <div class="additional-actions">
                        <button class="btn btn-outline" onclick="openCardModal()">
                            <i class="bi bi-envelope-heart"></i>
                            카드 만들기
                        </button>
                        </div>
                    </div>

                    <!-- 카드 모달 영역 -->
                    <div id="cardModal" class="modal hidden">
                    <div class="modal-content card-modal">
                        <h4>🌸 전하고 싶은 말을 카드로 만들기</h4>
                        <div class="form-group">
                            <label>받는 사람</label>
                            <input type="text" id="cardTo" placeholder="To. 누구에게">
                        </div>
                        <div class="form-group">
                            <label>메시지</label>
                            <textarea id="cardMsg" rows="4" placeholder="메시지를 입력하세요"></textarea>
                        </div>
                        <div class="form-group">
                            <label>보내는 사람</label>
                            <input type="text" id="cardFrom" placeholder="From. 보내는 사람">
                        </div>
                        <div class="modal-buttons">
                            <button class="btn btn-primary" onclick="previewCard()">미리보기</button>
                        </div>
                        <div id="cardPreviewArea" class="preview-area" style="margin-top: 1.5rem;"></div>
                        <div class="modal-buttons">
                            <button class="btn btn-secondary" id="downloadCard" onclick="downloadCard()" disabled>
                                <i class="bi bi-download"></i> 카드 다운로드
                            </button>
                            `+
                            /*
                            <button class="btn btn-outline" onclick="shareCard()">
                                <i class="bi bi-share-fill"></i> <span id="shareText">공유하기</span>
                            </button>
                            */
                            `
                            <button class="btn btn-outline" onclick="closeCardModal()">닫기</button>
                        </div>
                    </div>
                    </div>
                `;
                
            } catch (error) {
                console.error('결과 데이터 파싱 오류:', error);
                resultContainer.innerHTML = `
                    <div class="error">
                        <h2>오류가 발생했습니다</h2>
                        <p>결과 데이터를 처리하는 중 오류가 발생했습니다.</p>
                        <a href="/image" class="btn btn-primary">다시 생성하기</a>
                    </div>
                `;
            }
        });
        
        // 이미지 다운로드 함수
        function downloadImage() {
            const resultDataStr = sessionStorage.getItem('generatedImageResult');
            if (!resultDataStr) return;
            
            try {
                const resultData = JSON.parse(resultDataStr);
                const link = document.createElement('a');
                link.href = resultData.image;
                link.download = `flower_bouquet_${new Date().getTime()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                alert('다운로드 중 오류가 발생했습니다.');
            }
        }
        
        // 보관함에 저장 함수 (이미 저장됨을 알림)
        async function goToGallery() {
            try {
                const response = await fetch('/check-login', {
                    method: 'GET',
                    credentials: 'include'  // 세션 쿠키 포함
                });

                const result = await response.json();

                if (result.loggedIn) {
                    window.location.href = '/gallery';
                } else {
                    alert('보관함은 로그인한 사용자만 이용할 수 있습니다.');
                    window.location.href = '/login';
                }

            } catch (err) {
                console.error('로그인 상태 확인 중 오류 발생:', err);
                alert('서버 오류가 발생했습니다.');
            }
        }
        
        // 공유 함수
        function shareImage() {
            if (navigator.share) {
                const resultDataStr = sessionStorage.getItem('generatedImageResult');
                if (resultDataStr) {
                    const resultData = JSON.parse(resultDataStr);
                    navigator.share({
                        title: 'FlowerMind로 생성한 꽃 이미지',
                        text: '내가 만든 AI 꽃다발을 확인해보세요!',
                        url: window.location.href
                    });
                }
            } else {
                // Web Share API를 지원하지 않는 경우
                const url = window.location.href;
                navigator.clipboard.writeText(url).then(() => {
                    alert('링크가 클립보드에 복사되었습니다!');
                }).catch(() => {
                    alert('공유 기능을 사용할 수 없습니다.');
                });
            }
        }