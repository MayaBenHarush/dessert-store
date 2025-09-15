// public/assets/homepage.js

// בדיקת סטטוס התחברות ובניית ניווט דינמי
async function buildNavigation() {
    let isLoggedIn = false;
    let isAdmin = false;
    
    try {
        const response = await fetch('/api/session');
        if (response.ok) {
            const data = await response.json();
            isLoggedIn = true;
            isAdmin = (data.username === 'admin');
        }
    } catch (error) {
        console.log('Not logged in');
    }
    
    const navMenu = document.getElementById('navMenu');
    let navItems = '';
    
    if (isLoggedIn) {
        // משתמש מחובר - ניווט מלא
        navItems = `
            <a href="screens/store.html" class="nav-item">חנות</a>
            <a href="screens/cart.html" class="nav-item">עגלת קניות</a>
            <a href="screens/checkout.html" class="nav-item">תשלום</a>
            <a href="screens/myitems.html" class="nav-item">הרכישות שלי</a>
            <a href="screens/cake-designer.html" class="nav-item">עיצוב עוגה</a>
            <a href="screens/recipes.html" class="nav-item">מתכונים</a>
            <a href="screens/dessert-finder.html" class="nav-item">מציאת קינוח מושלם</a>
            <a href="screens/wheel.html" class="nav-item">גלגל מזל</a>
            ${isAdmin ? '<a href="screens/admin.html" class="nav-item">ניהול</a>' : ''}
        `;
    } else {
        // משתמש לא מחובר - ניווט מוגבל
        navItems = `
            <a href="screens/store.html" class="nav-item">חנות</a>
            <a href="screens/cake-designer.html" class="nav-item">עיצוב עוגה</a>
        `;
    }
    
    navMenu.innerHTML = navItems;
}

// בדיקת סטטוס התחברות לכפתורי התחברות/התנתקות
async function updateAuthButtons() {
    let isLoggedIn = false;
    
    try {
        const response = await fetch('/api/session');
        if (response.ok) {
            isLoggedIn = true;
        }
    } catch (error) {
        isLoggedIn = false;
    }
    
    const authButtons = document.querySelector('.auth-buttons');
    
    if (isLoggedIn) {
        authButtons.innerHTML = `
            <button onclick="logout()" class="nav-item login-btn">התנתקות</button>
        `;
    } else {
        authButtons.innerHTML = `
            <a href="screens/login.html" class="nav-item login-btn">התחברות</a>
            <a href="screens/register.html" class="nav-item register-btn">הרשמה</a>
        `;
    }
}

// פונקציית התנתקות
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
        console.log('Logout error:', error);
    }
    location.reload();
}

// פונקציית השמעת הקלטה "מי אנחנו"
function initializeAboutUsAudio() {
    const aboutUsBtn = document.getElementById('about-us-btn');
    const audio = document.getElementById('about-us-audio');
    
    if (!aboutUsBtn || !audio) return;

    aboutUsBtn.addEventListener('click', function() {
        if (audio.paused) {
            // התחל השמעה
            audio.play().then(() => {
                aboutUsBtn.classList.add('playing');
                aboutUsBtn.innerHTML = 'מי אנחנו 🔊';
            }).catch(error => {
                console.error('Error playing audio:', error);
                alert('שגיאה בהשמעת הקובץ. אנא ודא שקובץ aboutus.mp3 נמצא בתיקיה הנכונה.');
            });
        } else {
            // עצור השמעה
            audio.pause();
            audio.currentTime = 0;
            aboutUsBtn.classList.remove('playing');
            aboutUsBtn.innerHTML = 'מי אנחנו';
        }
    });

    // טיפול בסיום השמעה
    audio.addEventListener('ended', function() {
        aboutUsBtn.classList.remove('playing');
        aboutUsBtn.innerHTML = 'מי אנחנו';
    });

    // טיפול בשגיאות
    audio.addEventListener('error', function(e) {
        console.error('Audio error:', e);
        aboutUsBtn.classList.remove('playing');
        aboutUsBtn.innerHTML = 'מי אנחנו';
        alert('לא ניתן לטעון את קובץ השמע. אנא ודא שקובץ aboutus.mp3 קיים בתיקיה: C:/SecondYear/FullStack/dessert-store/public/');
    });
}

// אירועי אינטראקציה לכרטיסי קטגוריות
function initializeInteractions() {
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// טעינה ראשונית
document.addEventListener('DOMContentLoaded', async function() {
    await buildNavigation();
    await updateAuthButtons();
    initializeInteractions();
    initializeAboutUsAudio(); // הוספת אתחול פונקציית האודיו
});