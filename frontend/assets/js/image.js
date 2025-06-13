// 장바구니 세트 관리 변수들
      let basketSet1 = null;
      let basketSet2 = null;
      let basketSet3 = null;
      let currentSetCount = 0;
      let currentUser = null; // 현재 사용자 정보

    
        
      document.addEventListener('DOMContentLoaded', async () => {
        const input = document.getElementById("dropdownInput");
        const dropdown = document.getElementById("dropdownList");
        const imageGrid = document.querySelector('.image-grid');

        // 초기 안내 메시지
        imageGrid.innerHTML = "<p class='initial-message'>🌸꽃을 검색해보세요!🌸</p>";
          // 먼저 사용자 정보 가져오기
          try {
              const response = await fetch('/me');
              const result = await response.json();
              
              if (result.success) {
                  currentUser = result.data;
                  console.log('현재 사용자:', currentUser);
              } else {
                  console.log('로그인되지 않은 사용자');
                  alert('로그인이 필요합니다.');
                  window.location.href = '/login';
                  return;
              }
          } catch (error) {
              console.error('사용자 정보 가져오기 실패:', error);
              alert('사용자 정보를 가져올 수 없습니다.');
              window.location.href = '/login';
              return;
          }

          // 장바구니에 꽃 추가하는 함수 (최대 3세트)
          function addToBasket(name, season, color, imageUrl) {
              console.log('addToBasket 호출됨:', name, season, color);
              
              if (currentSetCount >= 3) {
                  alert('장바구니에는 최대 3세트까지만 추가할 수 있습니다.');
                  return;
              }

              const basketItems = document.getElementById('basketItems');
              
              // 새로운 세트 데이터 생성
              const newSet = {
                  id: currentSetCount + 1,
                  name: name,
                  season: season || '',
                  color: color,
                  imageUrl: imageUrl
              };

              // 세트 변수에 할당
              if (currentSetCount === 0) {
                  basketSet1 = newSet;
              } else if (currentSetCount === 1) {
                  basketSet2 = newSet;
              } else if (currentSetCount === 2) {
                  basketSet3 = newSet;
              }

              // 새로운 장바구니 아이템 요소 생성
              const basketItem = document.createElement('div');
              basketItem.className = 'basket-item';
              basketItem.dataset.setId = newSet.id;
              
              basketItem.innerHTML = `
                  <div class="basket-item-info">
                      <div class="set-label">세트 ${newSet.id}</div>
                      <img src="${imageUrl}" alt="${name}" class="basket-item-img">
                      <div class="basket-flower-name">${name}</div>
                      <div class="basket-flower-season">${season || ''}</div>
                      <div class="basket-flower-color">${color}</div>
                  </div>
                  <button class="remove-item" data-set-id="${newSet.id}">X</button>
              `;
              
              // 삭제 버튼에 이벤트 리스너 추가
              const removeButton = basketItem.querySelector('.remove-item');
              removeButton.addEventListener('click', (e) => {
                  e.stopPropagation();
                  const setId = parseInt(e.target.dataset.setId);
                  removeFromBasket(setId);
              });
              
              // 장바구니에 아이템 추가
              basketItems.appendChild(basketItem);
              currentSetCount++;
              
              // 장바구니 카운트 업데이트
              updateBasketCount();
              
              console.log('현재 세트들:', { basketSet1, basketSet2, basketSet3 });
          }

          // 장바구니에서 세트 제거 함수
          function removeFromBasket(setId) {
              // 해당 세트 변수를 null로 설정
              if (setId === 1) {
                  basketSet1 = null;
              } else if (setId === 2) {
                  basketSet2 = null;
              } else if (setId === 3) {
                  basketSet3 = null;
              }

              // DOM에서 해당 아이템 제거
              const itemToRemove = document.querySelector(`[data-set-id="${setId}"]`);
              if (itemToRemove) {
                  itemToRemove.remove();
              }

              // 세트 재정렬 (빈 공간 없애기)
              reorganizeBasketSets();
              updateBasketCount();
              
              console.log('제거 후 세트들:', { basketSet1, basketSet2, basketSet3 });
          }

          // 장바구니 세트 재정렬 함수
          function reorganizeBasketSets() {
              const activeSets = [];
              
              // null이 아닌 세트들만 수집
              if (basketSet1) activeSets.push(basketSet1);
              if (basketSet2) activeSets.push(basketSet2);
              if (basketSet3) activeSets.push(basketSet3);

              // 모든 세트 변수 초기화
              basketSet1 = null;
              basketSet2 = null;
              basketSet3 = null;

              // 세트 카운트 업데이트
              currentSetCount = activeSets.length;

              // 활성 세트들을 순서대로 재할당
              activeSets.forEach((set, index) => {
                  const newId = index + 1;
                  set.id = newId;
                  
                  if (index === 0) basketSet1 = set;
                  else if (index === 1) basketSet2 = set;
                  else if (index === 2) basketSet3 = set;
              });

              // DOM 다시 렌더링
              rerenderBasketItems();
          }

          // 장바구니 아이템들 다시 렌더링
          function rerenderBasketItems() {
              const basketItems = document.getElementById('basketItems');
              basketItems.innerHTML = '';

              const sets = [basketSet1, basketSet2, basketSet3].filter(set => set !== null);
              
              sets.forEach(set => {
                  const basketItem = document.createElement('div');
                  basketItem.className = 'basket-item';
                  basketItem.dataset.setId = set.id;
                  
                  basketItem.innerHTML = `
                      <div class="basket-item-info">
                          <div class="set-label">세트 ${set.id}</div>
                          <img src="${set.imageUrl}" alt="${set.name}" class="basket-item-img">
                          <div class="basket-flower-name">${set.name}</div>
                          <div class="basket-flower-season">${set.season}</div>
                          <div class="basket-flower-color">${set.color}</div>
                      </div>
                      <button class="remove-item" data-set-id="${set.id}">X</button>
                  `;
                  
                  const removeButton = basketItem.querySelector('.remove-item');
                  removeButton.addEventListener('click', (e) => {
                      e.stopPropagation();
                      const setId = parseInt(e.target.dataset.setId);
                      removeFromBasket(setId);
                  });
                  
                  basketItems.appendChild(basketItem);
              });
          }

          // 장바구니 아이템 개수 업데이트 함수
          function updateBasketCount() {
              const totalCount = document.getElementById('totalCount');
              totalCount.textContent = currentSetCount;
          }

          // 꽃 이름 로딩
          fetch("/flowers")
              .then(res => res.json())
              .then(data => {
                  dropdown.innerHTML = "";
                  data.forEach(name => {
                      const div = document.createElement("div");
                      div.textContent = name;
                      dropdown.appendChild(div);
                  });
              })
              .catch(err => {
                  console.log('꽃 데이터 로딩 실패:', err);
                  // 테스트용 더미 데이터
                  const testFlowers = ['장미', '튤립', '카네이션', '국화', '해바라기'];
                  dropdown.innerHTML = "";
                  testFlowers.forEach(name => {
                      const div = document.createElement("div");
                      div.textContent = name;
                      dropdown.appendChild(div);
                  });
              });

          input.addEventListener("focus", () => {
              dropdown.style.display = "block";
          });

          input.addEventListener("input", () => {
              const filter = input.value.toLowerCase();
              const options = dropdown.querySelectorAll("div");
              options.forEach(opt => {
                  opt.style.display = opt.textContent.toLowerCase().includes(filter) ? "" : "none";
              });
          });

          dropdown.addEventListener("click", (e) => {
              if (e.target.tagName === "DIV") {
                  input.value = e.target.textContent;
                  dropdown.style.display = "none";
              }
          });

          document.addEventListener("click", (e) => {
              if (!e.target.closest(".dropdown")) {
                  dropdown.style.display = "none";
              }
          });

          // 라디오 중복 선택 해제
          let selectedRadio = null;
          document.querySelectorAll('input[name="season"]').forEach(radio => {
              radio.addEventListener("click", function () {
                  if (this === selectedRadio) {
                      this.checked = false;
                      selectedRadio = null;
                  } else {
                      selectedRadio = this;
                  }
              });
          });

          // 검색 동작
          document.querySelector('.flower-search-form').addEventListener('submit', (e) => {
              e.preventDefault();

              const name = input.value.trim();
              const season = document.querySelector('input[name="season"]:checked')?.value;
              const colors = Array.from(document.querySelectorAll('input[name="color"]:checked')).map(cb => cb.value);

              const query = {
                  ...(name && { name }),
                  ...(season && { season }),
                  ...(colors.length > 0 && { colors })
              };

              fetch("/search-flowers", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(query)
              })
              .then(res => res.json())
              .then(data => {
                  imageGrid.innerHTML = "";

                    if (data.length === 0) {
                        imageGrid.classList.add('no-results-mode');    
                        imageGrid.classList.remove('default-mode');    
                        imageGrid.innerHTML = "<p class='no-results'>검색 결과가 없습니다.</p>";
                        return;
                    } else {
                        imageGrid.classList.add('default-mode');        
                        imageGrid.classList.remove('no-results-mode');  
                    }

                  data.forEach(flower => {
                      flower.variations
                          .filter(variation => colors.length === 0 || colors.includes(variation.color))
                          .forEach(variation => {
                              const card = document.createElement("div");
                              card.className = "image-card";

                              const img = document.createElement("img");
                              img.src = variation.imageUrl;
                              img.alt = `${flower.name} (${variation.color})`;

                              const overlay = document.createElement("div");
                              overlay.className = "image-overlay";

                              overlay.innerHTML = `
                                  <div class="flower-name">${flower.name}</div>
                                  <div class="flower-season">${flower.season}</div>
                                  <div class="flower-color">${variation.color}</div>
                              `;

                              card.addEventListener('click', (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('카드 클릭됨:', flower.name);
                                  addToBasket(flower.name, flower.season, variation.color, variation.imageUrl);
                              });

                              card.appendChild(img);
                              card.appendChild(overlay);
                              imageGrid.appendChild(card);
                          });
                  });
              })
              .catch(err => {
                  console.log('검색 실패:', err);
              });
          });

          // 전역 함수로 노출 (다른 스크립트에서 접근 가능하도록)
          window.addToBasket = addToBasket;
          window.getBasketSets = () => ({ basketSet1, basketSet2, basketSet3 });
      });

      // 이미지 생성 함수 - 사용자 정보 포함
      // 이미지 생성 함수 - 사용자 정보 포함 및 결과 페이지 이동
async function processInpainting() {
    // 사용자 로그인 확인
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login';
        return;
    }

    const selectedOption = document.querySelector('input[name="flowerType"]:checked');
    if (!selectedOption) {
        alert("이미지 옵션을 선택해주세요");
        return;
    }
    
    if (currentSetCount === 0) {
        alert("장바구니에 꽃을 추가해주세요");
        return;
    }

    // 로딩 표시
    const loadingAlert = document.createElement('div');
    loadingAlert.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 1000;
        text-align: center;
    `;
    loadingAlert.innerHTML = '<p>이미지를 생성하고 있습니다...<br>잠시만 기다려주세요.</p>';
    document.body.appendChild(loadingAlert);

    const selectoption = selectedOption.value;
    
    // 모든 활성 세트의 정보를 수집
    const activeSets = [];
    if (basketSet1) activeSets.push(basketSet1);
    if (basketSet2) activeSets.push(basketSet2);
    if (basketSet3) activeSets.push(basketSet3);

    console.log('처리할 세트들:', activeSets);
    console.log('현재 사용자:', currentUser);

    try {
        // API 호출 - 세션에서 가져온 사용자 정보 포함
        const response = await fetch('https://syw87biihc.execute-api.ap-northeast-2.amazonaws.com/default/putFlowerImage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                selectoption: selectoption,
                set1: basketSet1,
                set2: basketSet2,
                set3: basketSet3,
                userId: currentUser._id,        // MongoDB ObjectId
                userName: currentUser.name      // 사용자 이름
            })
        });

        const data = await response.json();
        console.log('API 응답:', data);
        
        // 로딩 알림 제거
        document.body.removeChild(loadingAlert);
        
        if (data.success) {
            // 결과 데이터를 sessionStorage에 저장
            const resultData = {
                image: data.image,              // base64 이미지
                s3Url: data.s3Url,             // S3 URL
                prompt: data.prompt,            // 생성된 프롬프트
                flowerSets: data.flowerSets,    // 사용된 꽃 세트들
                savedImage: data.savedImage,    // 저장된 이미지 정보
                backgroundType: data.savedImage.backgroundType,
                timestamp: new Date().toISOString()
            };
            
            // sessionStorage에 결과 저장
            sessionStorage.setItem('generatedImageResult', JSON.stringify(resultData));
            
            // 결과 페이지로 이동
            window.location.href = '/result';
            
        } else {
            alert('이미지 생성 중 오류가 발생했습니다: ' + (data.error || '알 수 없는 오류'));
        }
    } catch (error) {
        // 로딩 알림 제거
        if (document.body.contains(loadingAlert)) {
            document.body.removeChild(loadingAlert);
        }
        console.error('API 오류:', error);
        alert(`상세 오류: ${error.message}`);
    }
}

      // 장바구니 초기화 함수
      function resetBasket() {
          basketSet1 = null;
          basketSet2 = null;
          basketSet3 = null;
          currentSetCount = 0;
          
          document.getElementById('basketItems').innerHTML = '';
          updateBasketCount();
          
          // 꽃 구성 형태 선택 초기화
          document.querySelectorAll('input[name="flowerType"]').forEach(radio => {
              radio.checked = false;
          });
      }