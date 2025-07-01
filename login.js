document.addEventListener('DOMContentLoaded', () => {
    const loginManager = {
        nicknameInput: document.getElementById('nickname-input'),
        loginBtn: document.getElementById('login-btn'),
        modal: document.getElementById('disambiguation-modal'),
        modalContent: document.querySelector('#disambiguation-modal > div'),
        gradeSelect: document.getElementById('grade-select'),
        classSelect: document.getElementById('class-select'),
        confirmBtn: document.getElementById('confirm-login-btn'),
        cancelBtn: document.getElementById('cancel-modal-btn'),
        
        tempNickname: '',

        init() {
            this.populateSelectors();
            this.loginBtn.addEventListener('click', this.handleLoginAttempt.bind(this));
            this.nicknameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLoginAttempt();
                }
            });
            this.confirmBtn.addEventListener('click', this.handleDisambiguation.bind(this));
            this.cancelBtn.addEventListener('click', this.hideModal.bind(this));
            
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hideModal();
                }
            });
        },

        populateSelectors() {
            const grades = ['高一', '高二', '高三'];
            grades.forEach(grade => {
                const option = document.createElement('option');
                option.value = grade;
                option.textContent = grade;
                this.gradeSelect.appendChild(option);
            });

            for (let i = 1; i <= 20; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}班`;
                this.classSelect.appendChild(option);
            }
        },
        
        getUsers() {
            try {
                return JSON.parse(localStorage.getItem('allUsersData')) || {};
            } catch (e) {
                console.error('Error parsing user data from localStorage', e);
                return {};
            }
        },

        handleLoginAttempt() {
            const nickname = this.nicknameInput.value.trim();
            if (!nickname) {
                alert('昵称不能为空！');
                return;
            }

            const allUsers = this.getUsers();
            const existingNicknames = Object.keys(allUsers).map(id => id.split('-').pop());

            if (existingNicknames.includes(nickname)) {
                this.tempNickname = nickname;
                this.showModal();
            } else {
                this.loginUser(nickname);
            }
        },
        
        handleDisambiguation() {
            const grade = this.gradeSelect.value;
            const klass = this.classSelect.value;
            const uniqueId = `${grade}${klass}班-${this.tempNickname}`;
            
            this.loginUser(uniqueId);
        },

        loginUser(username) {
            localStorage.setItem('currentUser', username);
            
            const allUsers = this.getUsers();
            if (!allUsers[username]) {
                allUsers[username] = { checkin_dates: [] };
                localStorage.setItem('allUsersData', JSON.stringify(allUsers));
            }
            
            window.location.href = 'index.html';
        },
        
        showModal() {
            this.modal.classList.remove('hidden');
            setTimeout(() => {
                this.modal.classList.remove('opacity-0');
                this.modalContent.classList.remove('scale-95');
            }, 10); 
        },

        hideModal() {
             this.modal.classList.add('opacity-0');
             this.modalContent.classList.add('scale-95');
             setTimeout(() => {
                this.modal.classList.add('hidden');
            }, 300);
        }
    };

    loginManager.init();
});
