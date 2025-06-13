// 실시간 검증 함수들
        function validateId(id) {
            const idRegex = /^[a-zA-Z0-9]{4,20}$/;
            return idRegex.test(id);
        }

        function validatePassword(password) {
            return password.length >= 8;
        }

        function getPasswordStrength(password) {
            let strength = 0;
            if (password.length >= 8) strength++;
            if (/[a-z]/.test(password)) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            return strength;
        }

        function validateEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        function validateName(name) {
            // 공백 제거 후 길이 체크
            const trimmedName = name.trim();
            if (trimmedName.length < 2 || trimmedName.length > 10) {
                return false;
            }
            
            // 숫자 포함 체크
            if (/\d/.test(name)) {
                return false;
            }
            
            // 일반적인 특수문자 제외 (@, #, $, %, ^, &, *, (, ), -, _, +, =, [, ], {, }, |, \, :, ;, ", ', <, >, ,, ., ?, /, ~, `)
            if (/[@#$%^&*()_+=\[\]{}|\\:";'<>,.?/~`!-]/.test(name)) {
                return false;
            }
            
            return true;
        }

        function validateAge(age) {
            const numAge = Number(age);
            return Number.isInteger(numAge) && numAge >= 0 && numAge <= 120;
        }

        function showError(containerId, errorId, message) {
            const container = document.getElementById(containerId);
            const errorElement = document.getElementById(errorId);
            container.classList.add('error');
            container.classList.remove('success');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        function showSuccess(containerId, errorId) {
            const container = document.getElementById(containerId);
            const errorElement = document.getElementById(errorId);
            container.classList.add('success');
            container.classList.remove('error');
            errorElement.style.display = 'none';
        }

        // 실시간 검증 이벤트 리스너
        document.getElementById('reg-id').addEventListener('input', function() {
            const id = this.value;
            if (id === '') {
                document.getElementById('id-container').classList.remove('error', 'success');
                document.getElementById('id-error').style.display = 'none';
            } else if (!validateId(id)) {
                showError('id-container', 'id-error', 'ID는 4-20자의 영문자와 숫자만 사용 가능합니다.');
            } else {
                showSuccess('id-container', 'id-error');
            }
        });

        document.getElementById('reg-passwd').addEventListener('input', function() {
            const password = this.value;
            const strengthElement = document.getElementById('password-strength');
            
            if (password === '') {
                document.getElementById('password-container').classList.remove('error', 'success');
                document.getElementById('password-error').style.display = 'none';
                strengthElement.textContent = '';
            } else if (!validatePassword(password)) {
                showError('password-container', 'password-error', '비밀번호는 8자 이상이어야 합니다.');
                strengthElement.textContent = '';
            } else {
                showSuccess('password-container', 'password-error');
                
                // 비밀번호 강도 표시
                const strength = getPasswordStrength(password);
                if (strength <= 2) {
                    strengthElement.textContent = '약함';
                    strengthElement.className = 'password-strength strength-weak';
                } else if (strength <= 4) {
                    strengthElement.textContent = '보통';
                    strengthElement.className = 'password-strength strength-medium';
                } else {
                    strengthElement.textContent = '강함';
                    strengthElement.className = 'password-strength strength-strong';
                }
            }
        });

        document.getElementById('reg-email').addEventListener('input', function() {
            const email = this.value;
            if (email === '') {
                document.getElementById('email-container').classList.remove('error', 'success');
                document.getElementById('email-error').style.display = 'none';
            } else if (!validateEmail(email)) {
                showError('email-container', 'email-error', '올바른 이메일 형식이 아닙니다.');
            } else {
                showSuccess('email-container', 'email-error');
            }
        });

        document.getElementById('reg-name').addEventListener('input', function() {
            const name = this.value;
            if (name === '') {
                document.getElementById('name-container').classList.remove('error', 'success');
                document.getElementById('name-error').style.display = 'none';
            } else if (!validateName(name)) {
                showError('name-container', 'name-error', '이름은 2-10자이며 숫자와 특수문자는 사용할 수 없습니다.');
            } else {
                showSuccess('name-container', 'name-error');
            }
        });

        document.getElementById('reg-age').addEventListener('input', function() {
            const age = this.value;
            if (age === '') {
                document.getElementById('age-container').classList.remove('error', 'success');
                document.getElementById('age-error').style.display = 'none';
            } else if (!validateAge(age)) {
                showError('age-container', 'age-error', '나이는 14세 이상 120세 이하여야 합니다.');
            } else {
                showSuccess('age-container', 'age-error');
            }
        });

        // 폼 제출 검증
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
        
            // 입력값 수집
            const userid = document.getElementById('reg-id').value;
            const password = document.getElementById('reg-passwd').value;
            const email = document.getElementById('reg-email').value;
            const name = document.getElementById('reg-name').value;
            const age = document.getElementById('reg-age').value;

            // 최종 검증
            let isValid = true;

            if (!validateId(userid)) {
                showError('id-container', 'id-error', 'ID는 4-20자의 영문자와 숫자만 사용 가능합니다.');
                isValid = false;
            }

            if (!validatePassword(password)) {
                showError('password-container', 'password-error', '비밀번호는 8자 이상이어야 합니다.');
                isValid = false;
            }

            if (!validateEmail(email)) {
                showError('email-container', 'email-error', '올바른 이메일 형식이 아닙니다.');
                isValid = false;
            }

            if (!validateAge(age)) {
                showError('age-container', 'age-error', '수여야 합니다.');
                isValid = false;
            }

            if (!isValid) {
                alert('입력값을 다시 확인해주세요.');
                return;
            }
        
            try {
                const res = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userid, password, email, name, age })
                });
        
                const result = await res.json();
        
                if (res.ok) {
                    alert('회원가입 성공! 로그인 페이지로 이동합니다.');
                    window.location.href = '/login';  // 로그인 페이지로 이동
                } else {
                    alert(result.message || '회원가입 실패');
                }
            } catch (err) {
                console.error(err);
                alert('서버 오류가 발생했습니다.');
            }
        });