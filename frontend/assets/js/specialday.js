document.addEventListener("DOMContentLoaded", () => {
      //특별한 날 객체
      const specialDays = {
          "02-14": { 
            name: "장미", 
            meaning: "열정적인 사랑", 
            imageurl: "https://capstone-mogumogu-s3.s3.ap-northeast-2.amazonaws.com/flower_images/Rose_red.jpg",
            description: "2월 14일, 발렌타인데이의 꽃은 장미입니다. 사랑의 진심을 붉은 장미에 담아보세요.",
            title: "발렌타인데이" },
          "03-14": { 
            name: "백합", 
            meaning: "순수한 사랑", 
            imageurl: "https://capstone-mogumogu-s3.s3.ap-northeast-2.amazonaws.com/flower_images/Lily_white.jpg", 
            title: "화이트데이" },
          "05-08": {
            name: "카네이션", 
            meaning: "존경과 감사", 
            imageurl: "/images/carnation.jpg", 
            title: "어버이날" },
          "05-15": { 
            name: "백합", 
            meaning: "감사의 마음", 
            imageurl: "https://capstone-mogumogu-s3.s3.ap-northeast-2.amazonaws.com/flower_images/Lily_white.jpg", 
            title: "스승의 날" },
          "12-25": { 
            name: "포인세티아", 
            meaning: "축복과 따뜻함", 
            imageurl: "/images/poinsettia.jpg", 
            title: "크리스마스" }
      };

      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0'); // 월 (0부터 시작 → +1)
      const date = String(today.getDate()).padStart(2, '0');       // 일
      const todayKey = `${month}-${date}`;                         // 'MM-DD' 형태로 조합

      if (specialDays[todayKey]) {
          // 특별 기념일일 경우
          const flower = specialDays[todayKey];
          document.querySelector('.default-ui').style.display = 'none'; // 닫음
          document.querySelector('.event-ui').style.display = 'flex';   // 열어둠

          document.querySelector('.event-title').textContent = flower.title;
          document.querySelector('.event-flower-name').textContent = flower.name;
          document.querySelector('.event-flower-meaning').textContent = flower.meaning;
          document.querySelector('.event-flower-description').textContent = flower.description;
          document.querySelector('.event-flower-image').src = flower.imageurl;
      } else {
          // 일반 꽃 데이터 로딩(특별한 날이 아닐 때)
          fetch('/today-flower')
          .then(response => response.json())
          .then(data => {
              document.querySelector('.flower-name').textContent = data.name;
              document.querySelector('.flower-meaning').textContent = data.meaning;
              document.querySelector('.flower-description').textContent = data.description;
              document.querySelector('.setting-icon').src = data.representative_imageurl;
          })
          .catch(error => {
              console.error('꽃 정보 로딩 실패:', error);
              console.log(`오류: ${err}`);
          });
        }
    });

    document.addEventListener("DOMContentLoaded", async () => {
      try {
        const response = await fetch("/top3");
        if (!response.ok) throw new Error("Top3 이미지 요청 실패");

        const top3Images = await response.json();

        const bestItems = document.querySelectorAll(".best-item");

        top3Images.forEach((item, index) => {
          if (index >= bestItems.length) return;

          const bestItem = bestItems[index];

          // 이미지 넣기
          const imgTag = bestItem.querySelector("img.best-image");
          imgTag.src = item.imageUrl;
          imgTag.alt = `Top ${index + 1} 이미지`;

          // 꽃 조합 텍스트 넣기
          const combination = item.flowerName.map((name, i) => {
            const color = item.flowerColor[i] || "색상 없음";
            return `${name}(${color})`;
          }).join(", ");

          const combinationText = bestItem.querySelector(".combination-text");
          combinationText.textContent = combination;
        });
      } catch (error) {
        console.error("Top3 이미지 로딩 실패:", error);
      }
    });