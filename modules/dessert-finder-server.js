<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>מציאת הקינוח המושלם</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/assets/styles.css" />
  <script src="/assets/translations"></script>
  <style>
    .finder-container {
      max-width: 800px;
      margin: 0 auto;
      background: var(--bg-card);
      border-radius: 20px;
      padding: 40px;
      box-shadow: var(--shadow-xl);
    }
    
    .quiz-section {
      margin-bottom: 40px;
    }
    
    .question-header {
      background: var(--gradient-primary);
      color: white;
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 24px;
      text-align: center;
    }
    
    .question-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }
    
    .question-subtitle {
      font-size: 1rem;
      opacity: 0.9;
      margin: 8px 0 0 0;
    }
    
    .options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }
    
    .option-card {
      background: var(--bg-primary);
      border: 3px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      cursor: pointer;
      transition: var(--transition-normal);
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .option-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--gradient-secondary);
      transform: scaleX(0);
      transition: var(--transition-normal);
      transform-origin: right;
    }
    
    .option-card:hover {
      border-color: var(--primary-color);
      transform: translateY(-4px);
      box-shadow: var(--shadow-md);
    }
    
    .option-card:hover::before {
      transform: scaleX(1);
    }
    
    .option-card.selected {
      border-color: var(--primary-color);
      background: var(--primary-light);
      color: white;
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    
    .option-card.selected::before {
      transform: scaleX(1);
      background: white;
    }
    
    .option-emoji {
      font-size: 2.5rem;
      margin-bottom: 12px;
      display: block;
    }
    
    .option-title {
      font-weight: 700;
      font-size: 1.1rem;
      margin-bottom: 8px;
    }
    
    .option-description {
      font-size: 0.9rem;
      opacity: 0.8;
      line-height: 1.4;
    }
    
    .progress-bar {
      background: #e2e8f0;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin: 32px 0;
    }
    
    .progress-fill {
      background: var(--gradient-secondary);
      height: 100%;
      transition: width 0.5s ease;
      border-radius: 4px;
    }
    
    .quiz-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 32px;
    }
    
    .quiz-btn {
      background: var(--gradient-secondary);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: var(--transition-normal);
    }
    
    .quiz-btn:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    
    .quiz-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    .quiz-btn.primary {
      background: var(--gradient-primary);
    }
    
    .results-section {
      display: none;
      text-align: center;
    }
    
    .results-header {
      background: var(--gradient-accent);
      color: var(--text-primary);
      padding: 32px;
      border-radius: 20px;
      margin-bottom: 32px;
    }
    
    .results-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .results-subtitle {
      font-size: 1.2rem;
      opacity: 0.8;
    }
    
    .recommendation-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin: 32px 0;
    }
    
    .recommendation-card {
      background: var(--bg-primary);
      border-radius: 20px;
      padding: 24px;
      box-shadow: var(--shadow-md);
      transition: var(--transition-normal);
      position: relative;
      overflow: hidden;
    }
    
    .recommendation-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: var(--gradient-primary);
    }
    
    .recommendation-card:hover {
      transform: translateY(-8px);
      box-shadow: var(--shadow-xl);
    }
    
    .recommendation-card.perfect-match::before {
      background: var(--gradient-accent);
      height: 8px;
    }
    
    .recommendation-card.perfect-match {
      border: 2px solid var(--accent-color);
    }
    
    .match-badge {
      background: var(--gradient-accent);
      color: var(--text-primary);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 16px;
      display: inline-block;
    }
    
    .recommendation-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 16px;
    }
    
    .recommendation-title {
      font-size: 1.3rem;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--text-primary);
    }
    
    .recommendation-price {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 12px;
    }
    
    .recommendation-description {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 16px;
    }
    
    .recommendation-reasons {
      background: rgba(255, 107, 157, 0.1);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 16px;
    }
    
    .recommendation-reasons h4 {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0 0 8px 0;
    }
    
    .recommendation-reasons ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .recommendation-reasons li {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-bottom: 4px;
      position: relative;
      padding-right: 16px;
    }
    
    .recommendation-reasons li::before {
      content: "✓";
      position: absolute;
      right: 0;
      color: var(--primary-color);
      font-weight: bold;
    }
    
    .add-to-cart-btn {
      background: var(--gradient-primary);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition-normal);
      width: 100%;
    }
    
    .add-to-cart-btn:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    
    .restart-quiz {
      background: var(--gradient-secondary);
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: var(--transition-normal);
      margin-top: 32px;
    }
    
    .restart-quiz:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    
    .hidden {
      display: none !important;
    }
    
    /* אנימציות */
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(-30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .question-slide-in {
      animation: slideInRight 0.5s ease;
    }
    
    @keyframes confetti {
      0% {
        transform: scale(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: scale(1) rotate(180deg);
        opacity: 0;
      }
    }
    
    .confetti {
      position: fixed;
      width: 10px;
      height: 10px;
      background: var(--accent-color);
      animation: confetti 1s ease-out;
      pointer-events: none;
      z-index: 1000;
    }
    
    @media (max-width: 768px) {
      .finder-container {
        padding: 24px;
        margin: 16px;
        border-radius: 16px;
      }
      
      .options-grid {
        grid-template-columns: 1fr;
      }
      
      .quiz-navigation {
        flex-direction: column;
        gap: 16px;
      }
      
      .recommendation-cards {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <nav>
    <a href="store.html">חנות</a>
    <a href="cart.html">סל הקניות</a>
    <a href="checkout.html">תשלום</a>
    <a href="myitems.html">הרכישות שלי</a>
    <a id="login-link" href="login.html">התחברות</a>
    <button id="logout" style="display:none">התנתקות</button>
    <a href="admin.html" id="admin-link" style="display:none">ניהול</a>
    <a href="cake-designer.html">🎨 עיצוב עוגה</a>
    <a href="wheel.html">🎡 גלגל מזל</a>
    <a href="dessert-finder.html" style="background: var(--gradient-accent); color: var(--text-primary);">🔍 מציאת קינוח</a>
    <button id="theme-toggle">🌙 מצב כהה</button>
    <button id="language-toggle">🌐 English</button>
  </nav>

  <div class="finder-container">
    <h1 style="text-align: center; margin-bottom: 32px;">🔍 מציאת הקינוח המושלם</h1>
    
    <!-- סעיף חידון -->
    <div id="quiz-section" class="quiz-section">
      <div class="progress-bar">
        <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
      </div>
      
      <div id="question-container">
        <!-- השאלות יוכנסו כאן דינמית -->
      </div>
      
      <div class="quiz-navigation">
        <button id="prev-btn" class="quiz-btn" disabled>שאלה קודמת</button>
        <span id="question-counter">שאלה 1 מתוך 6</span>
        <button id="next-btn" class="quiz-btn primary" disabled>שאלה הבאה</button>
      </div>
    </div>
    
    <!-- סעיף תוצאות -->
    <div id="results-section" class="results-section">
      <div class="results-header">
        <h2 class="results-title">מצאנו בשבילך!</h2>
        <p class="results-subtitle">הקינוחים המושלמים בהתאם להעדפות שלך</p>
      </div>
      
      <div id="recommendations-container" class="recommendation-cards">
        <!-- ההמלצות יוכנסו כאן דינמית -->
      </div>
      
      <button id="restart-quiz" class="restart-quiz">התחל שוב</button>
    </div>
  </div>

  <script>
    // נתוני השאלות והאפשרויות
    const QUESTIONS = [
      {
        id: 'occasion',
        title: 'איזה אירוע את מתכננת?',
        subtitle: 'זה יעזור לנו להמליץ על הגודל והסגנון המתאים',
        options: [
          {
            id: 'personal',
            emoji: '😋',
            title: 'פינוק אישי',
            description: 'רק בשבילי או לשניים'
          },
          {
            id: 'family',
            emoji: '👨‍👩‍👧‍👦',
            title: 'ערב משפחתי',
            description: '3-6 אנשים'
          },
          {
            id: 'party',
            emoji: '🎉',
            title: 'מסיבה/אירוע',
            description: '7+ אנשים'
          },
          {
            id: 'gift',
            emoji: '🎁',
            title: 'מתנה מיוחדת',
            description: 'לתת למישהו אהוב'
          }
        ]
      },
      {
        id: 'taste_preference',
        title: 'איזה טעם הכי מעניין אותך?',
        subtitle: 'בואי נמצא את הטעם שיגרום לך להתמוגג',
        options: [
          {
            id: 'chocolate',
            emoji: '🍫',
            title: 'שוקולד עשיר',
            description: 'אהבת שוקולד אמיתית'
          },
          {
            id: 'fruity',
            emoji: '🍊',
            title: 'פירותי ורענן',
            description: 'תפוזים וטעמים רעננים'
          },
          {
            id: 'sweet_treats',
            emoji: '🍯',
            title: 'מתוק וחמה',
            description: 'לוטוס, נוטלה, קרמל'
          },
          {
            id: 'mixed',
            emoji: '🌈',
            title: 'אוהבת הכל',
            description: 'פתוחה להפתעות'
          }
        ]
      },
      {
        id: 'texture',
        title: 'איזה מרקם הכי מושלם בשבילך?',
        subtitle: 'הטקסטורה משפיעה על כל החוויה',
        options: [
          {
            id: 'soft_cake',
            emoji: '🧽',
            title: 'עוגה רכה וספוגית',
            description: 'נמסת בפה'
          },
          {
            id: 'crunchy',
            emoji: '🥨',
            title: 'פריך ופריך',
            description: 'עוגיות עם נשיכה'
          },
          {
            id: 'creamy',
            emoji: '🍰',
            title: 'קרמי וחלק',
            description: 'קאפקייקס עם קרם'
          },
          {
            id: 'mixed_texture',
            emoji: '🎯',
            title: 'שילוב מרקמים',
            description: 'רך וקריספי ביחד'
          }
        ]
      },
      {
        id: 'dietary',
        title: 'יש הגבלות תזונתיות שכדאי לדעת?',
        subtitle: 'נוודא שהמוצר מתאים לך',
        options: [
          {
            id: 'none',
            emoji: '✨',
            title: 'ללא הגבלות',
            description: 'אוכלת הכל בתיאבון'
          },
          {
            id: 'nuts_aware',
            emoji: '🥜',
            title: 'נזהרת מאגוזים',
            description: 'אלרגיה או העדפה'
          },
          {
            id: 'light',
            emoji: '🪶',
            title: 'משהו קל יותר',
            description: 'לא כבד מדי'
          },
          {
            id: 'portions',
            emoji: '📏',
            title: 'מנות אישיות',
            description: 'מעדיפה מנות קטנות'
          }
        ]
      },
      {
        id: 'budget',
        title: 'איזה תקציב נוח לך?',
        subtitle: 'נמצא משהו מושלם בטווח המחירים שלך',
        options: [
          {
            id: 'budget',
            emoji: '💰',
            title: 'עד 100 ₪',
            description: 'משהו נחמד ובמחיר נוח'
          },
          {
            id: 'medium',
            emoji: '💳',
            title: '100-200 ₪',
            description: 'מוכנה להשקיע באיכות'
          },
          {
            id: 'premium',
            emoji: '💎',
            title: '200+ ₪',
            description: 'מחפשת משהו מיוחד'
          },
          {
            id: 'flexible',
            emoji: '🎯',
            title: 'גמישה',
            description: 'תלוי במה שמתאים'
          }
        ]
      },
      {
        id: 'presentation',
        title: 'כמה חשוב לך המראה והעיצוב?',
        subtitle: 'זה משפיע על הבחירה בין מוצרים פשוטים למעוצבים',
        options: [
          {
            id: 'simple',
            emoji: '🤎',
            title: 'פשוט וטעים',
            description: 'הטעם מעל הכל'
          },
          {
            id: 'nice',
            emoji: '📸',
            title: 'יפה לתמונות',
            description: 'נחמד להציג'
          },
          {
            id: 'wow',
            emoji: '🌟',
            title: 'משהו שמרשים',
            description: 'להפתיע ולבלוט'
          },
          {
            id: 'custom',
            emoji: '🎨',
            title: 'מותאם אישית',
            description: 'עיצוב בהתאמה אישית'
          }
        ]
      }
    ];

    // מצב האפליקציה
    let currentQuestion = 0;
    let answers = {};
    let isAuthenticated = false;

    // DOM elements
    const questionContainer = document.getElementById('question-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const questionCounter = document.getElementById('question-counter');
    const progressFill = document.getElementById('progress-fill');
    const quizSection = document.getElementById('quiz-section');
    const resultsSection = document.getElementById('results-section');
    const recommendationsContainer = document.getElementById('recommendations-container');
    const restartBtn = document.getElementById('restart-quiz');

    // אתחול האפליקציה
    async function initApp() {
      await checkAuth();
      showQuestion(0);
    }

    // בדיקת אימות משתמש
    async function checkAuth() {
      try {
        const response = await fetch('/api/session');
        isAuthenticated = response.ok;
      } catch (error) {
        isAuthenticated = false;
      }
    }

    // הצגת שאלה
    function showQuestion(index) {
      if (index < 0 || index >= QUESTIONS.length) return;
      
      currentQuestion = index;
      const question = QUESTIONS[index];
      
      // עדכון progress bar
      const progress = ((index + 1) / QUESTIONS.length) * 100;
      progressFill.style.width = `${progress}%`;
      
      // עדכון מונה שאלות
      questionCounter.textContent = `שאלה ${index + 1} מתוך ${QUESTIONS.length}`;
      
      // יצירת HTML לשאלה
      questionContainer.innerHTML = `
        <div class="question-slide-in">
          <div class="question-header">
            <h2 class="question-title">${question.title}</h2>
            <p class="question-subtitle">${question.subtitle}</p>
          </div>
          
          <div class="options-grid">
            ${question.options.map(option => `
              <div class="option-card" data-value="${option.id}" onclick="selectOption('${question.id}', '${option.id}')">
                <span class="option-emoji">${option.emoji}</span>
                <div class="option-title">${option.title}</div>
                <div class="option-description">${option.description}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
      // סימון תשובה קיימת
      if (answers[question.id]) {
        const selectedCard = questionContainer.querySelector(`[data-value="${answers[question.id]}"]`);
        if (selectedCard) {
          selectedCard.classList.add('selected');
        }
      }
      
      // עדכון כפתורי ניווט
      prevBtn.disabled = index === 0;
      nextBtn.disabled = !answers[question.id];
      nextBtn.textContent = index === QUESTIONS.length - 1 ? 'צפה בתוצאות' : 'שאלה הבאה';
    }

    // בחירת אפשרות
    function selectOption(questionId, optionId) {
      answers[questionId] = optionId;
      
      // עדכון ויזואלי
      const cards = questionContainer.querySelectorAll('.option-card');
      cards.forEach(card => card.classList.remove('selected'));
      
      const selectedCard = questionContainer.querySelector(`[data-value="${optionId}"]`);
      if (selectedCard) {
        selectedCard.classList.add('selected');
        
        // אפקט ויזואלי
        selectedCard.style.transform = 'scale(0.95)';
        setTimeout(() => {
          selectedCard.style.transform = '';
        }, 150);
      }
      
      // עדכון כפתור הבא
      nextBtn.disabled = false;
    }

    // חישוב המלצות מהשרת
    async function calculateRecommendations() {
      try {
        const response = await fetch('/api/dessert-finder/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers })
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.recommendations || [];
        } else {
          console.error('Failed to get recommendations:', response.status);
          return [];
        }
      } catch (error) {
        console.error('Error getting recommendations:', error);
        return [];
      }
    }

    // הצגת תוצאות
    async function showResults() {
      const recommendations = await calculateRecommendations();
      
      if (recommendations.length === 0) {
        recommendationsContainer.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <h3>אופס! לא מצאנו התאמה מושלמת</h3>
            <p>אולי נסי לשנות חלק מהתשובות או פני אלינו לייעוץ אישי</p>
          </div>
        `;
      } else {
        recommendationsContainer.innerHTML = recommendations.map((product, index) => `
          <div class="recommendation-card ${product.matchLevel === 'perfect' ? 'perfect-match' : ''}">
            ${product.matchLevel === 'perfect' ? '<div class="match-badge">⭐ ההתאמה הטובה ביותר</div>' : ''}
            <img src="/images/${product.image}" alt="${product.title}" class="recommendation-image" onerror="this.src='/images/placeholder.png'">
            <h3 class="recommendation-title">${product.title}</h3>
            <div class="recommendation-price">₪${product.price}</div>
            <p class="recommendation-description">${product.description || ''}</p>
            <div class="recommendation-reasons">
              <h4>למה זה מתאים לך:</h4>
              <ul>
                ${(product.reasons || []).map(reason => `<li>${reason}</li>`).join('')}
              </ul>
            </div>
            <button class="add-to-cart-btn" onclick="addToCart('${product.id}', '${product.title}')">
              הוסף לסל הקניות
            </button>
          </div>
        `).join('');
      }
      
      // מעבר לתוצאות עם אנימציה
      quizSection.style.display = 'none';
      resultsSection.style.display = 'block';
      
      // אפקט קונפטי להתאמה מושלמת
      if (recommendations.length > 0 && recommendations[0].matchLevel === 'perfect') {
        createConfetti();
      }
    }

    // אפקט קונפטי
    function createConfetti() {
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          const confetti = document.createElement('div');
          confetti.className = 'confetti';
          confetti.style.left = Math.random() * window.innerWidth + 'px';
          confetti.style.top = Math.random() * window.innerHeight + 'px';
          confetti.style.backgroundColor = ['#ff6b9d', '#4ecdc4', '#ffd93d', '#ff9a9e'][Math.floor(Math.random() * 4)];
          document.body.appendChild(confetti);
          
          setTimeout(() => confetti.remove(), 1000);
        }, i * 100);
      }
    }

    // הוספה לסל
    async function addToCart(productId, productTitle) {
      if (!isAuthenticated) {
        alert('יש להתחבר כדי להוסיף מוצרים לסל');
        window.location.href = 'login.html';
        return;
      }
      
      try {
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });
        
        if (response.ok) {
          // הצגת הודעת הצלחה
          const button = event.target;
          const originalText = button.textContent;
          button.textContent = '✓ נוסף לסל!';
          button.style.background = '#28a745';
          
          setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
          }, 2000);
          
          // אפקט ויזואלי נוסף
          button.style.transform = 'scale(0.95)';
          setTimeout(() => {
            button.style.transform = '';
          }, 150);
        } else {
          throw new Error('Failed to add to cart');
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        alert('שגיאה בהוספה לסל. נסה שוב.');
      }
    }

    // התחלה מחדש
    function restartQuiz() {
      currentQuestion = 0;
      answers = {};
      quizSection.style.display = 'block';
      resultsSection.style.display = 'none';
      showQuestion(0);
    }

    // Event listeners
    prevBtn.addEventListener('click', () => {
      if (currentQuestion > 0) {
        showQuestion(currentQuestion - 1);
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentQuestion < QUESTIONS.length - 1) {
        showQuestion(currentQuestion + 1);
      } else {
        showResults();
      }
    });

    restartBtn.addEventListener('click', restartQuiz);

    // אתחול UI
    function loadUICustomization() {
      const theme = localStorage.getItem('theme') || 'light';
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-toggle').textContent = '☀️ מצב בהיר';
      } else {
        document.getElementById('theme-toggle').textContent = '🌙 מצב כהה';
      }
      
      const lang = localStorage.getItem('language') || 'he';
      document.getElementById('language-toggle').textContent = lang === 'en' ? '🌐 עברית' : '🌐 English';
    }

    document.getElementById('theme-toggle').addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-theme');
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
      loadUICustomization();
    });

    async function setupAuth() {
      try {
        const r = await fetch('/api/session');
        if (r.ok) {
          const data = await r.json();
          document.getElementById('login-link').style.display = 'none';
          document.getElementById('logout').style.display = '';
          if (data.username === 'admin') {
            document.getElementById('admin-link').style.display = '';
          }
          isAuthenticated = true;
        }
      } catch {}
    }

    document.getElementById('logout').onclick = async () => {
      try { await fetch('/api/logout', { method: 'POST' }); }
      finally { location.href = 'login.html'; }
    };

    // הפעלת האפליקציה
    document.addEventListener('DOMContentLoaded', () => {
      loadUICustomization();
      setupAuth();
      initApp();
    });

    // הוספת פונקציה גלובלית לבחירת אפשרות
    window.selectOption = selectOption;
    window.addToCart = addToCart;
  </script>
</body>
</html>