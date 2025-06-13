function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

function openCardModal() {
  document.getElementById('cardModal').classList.remove('hidden');
  document.getElementById('cardPreviewArea').innerHTML = '';
  document.getElementById('downloadCard').disabled = true;

  const shareText = document.getElementById('shareText');
  shareText.textContent = isMobile() ? "공유하기" : "다른 앱으로 전송";
}

function closeCardModal() {
  document.getElementById('cardModal').classList.add('hidden');
}

function previewCard() {
  const to = document.getElementById('cardTo').value;
  const msg = document.getElementById('cardMsg').value;
  const from = document.getElementById('cardFrom').value;
  const dataStr = sessionStorage.getItem('generatedImageResult');
  if (!dataStr) return;
  const data = JSON.parse(dataStr);

  const card = document.createElement('div');
  card.className = 'card';

  const img = document.createElement('img');
  img.src = data.image;
  card.appendChild(img);

  const msgArea = document.createElement('div');
  msgArea.className = 'msg-area';
  msgArea.innerHTML = `
    ${to ? `<h3>To. ${to}</h3>` : ''}
    <p style="white-space:pre-line">${msg}</p>
    ${from ? `<p style="text-align:right">From. ${from}</p>` : ''}
    <p style="margin-top:1rem;font-size:.9rem;color:#888;">FlowerMind</p>
  `;
  card.appendChild(msgArea);

  const area = document.getElementById('cardPreviewArea');
  area.innerHTML = '';
  area.appendChild(card);
  document.getElementById('downloadCard').disabled = false;
}

function downloadCard() {
  const card = document.querySelector('#cardPreviewArea .card');
  html2canvas(card).then(canvas => {
    const link = document.createElement('a');
    link.download = `flower_card_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  });
}

function shareCard() {
  const card = document.querySelector('#cardPreviewArea .card');
  html2canvas(card).then(canvas => {
    canvas.toBlob(blob => {
      const file = new File([blob], 'flower_card.png', { type: 'image/png' });

      if (isMobile() && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: '꽃 카드 공유',
          text: 'FlowerMind에서 만든 카드입니다.'
        });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = 'flower_card.png';
        link.click();
        alert('카카오톡, Discord 등에서는 직접 이미지를 채팅창에 첨부해 주세요.');
      }
    });
  });
}