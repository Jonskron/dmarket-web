/**
 * D-Market Client Application
 * Communicates with PHP & MySQL backend (api.php)
 * Features:
 * - Subcategories & dynamic category tree
 * - Advanced multi-parameter search & filtering
 * - Detail photo carousel & OLX-style fullscreen lightbox gallery
 * - Admin client management (profile editing, password reset, account restoration)
 * - Two-way chat, favorites, ad posting & editing
 * - Support phone 87770648263
 */

(function () {
  'use strict';

  // Category and Subcategory Catalog Map
  const categoryMap = {
    'Недвижимость': ['Квартиры', 'Дома и дачи', 'Аренда', 'Земельные участки', 'Коммерческая'],
    'Транспорт': ['Легковые авто', 'Мототехника', 'Запчасти и аксессуары', 'Спецтехника', 'Водный транспорт'],
    'Электроника': ['Смартфоны и телефоны', 'Ноутбуки и ПК', 'ТВ и видео', 'Аудиотехника', 'Бытовая техника', 'Фото и видеокамеры'],
    'Дом': ['Мебель и интерьер', 'Бытовая техника', 'Ремонт и стройка', 'Посуда и текстиль', 'Растения и сад'],
    'Одежда и обувь': ['Женская одежда', 'Мужская одежда', 'Обувь', 'Детские товары', 'Аксессуары и часы'],
    'Услуги': ['Ремонт и строительство', 'Грузоперевозки', 'Ремонт техники', 'Красота и здоровье', 'Обучение и курсы', 'Фото и видеосъемка']
  };

  const categories = ['Все', ...Object.keys(categoryMap)];

  // Application State
  const state = {
    user: null,
    favorites: new Set(),
    listings: [],
    chats: [],
    activeChat: null,
    chatPollInterval: null,
    unreadMessagesCount: 0,
    selectedListing: null,
    activeSlideIndex: 0,
    lightboxOpen: false,
    category: 'Все',
    subcategory: 'Все',
    searchQuery: '',
    filters: {
      category: 'Все',
      subcategory: 'Все',
      minPrice: '',
      maxPrice: '',
      location: 'Все',
      sort: 'newest',
      onlyPhoto: false
    },
    filtersVisible: false,
    adminUsers: [],
    editingAdminUser: null,
    screen: 'home',
    modal: null,
  };

  // SVG Icons Definitions
  const icons = {
    search: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    plus: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    heart: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24"><path d="M20.8 5.8a5.4 5.4 0 0 0-7.6 0L12 7l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/></svg>',
    arrow: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    pin: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    clock: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></svg>',
    upload: '<svg class="icon" width="24" height="24" viewBox="0 0 24 24"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v5h14v-5"/></svg>',
    close: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>',
    user: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>',
    message: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24"><path d="M4 5.5h16v11H9l-5 4v-15Z"/><path d="M8 10h8M8 13h5"/></svg>',
    send: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
    maximize: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
    shield: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    users: '<svg class="icon" width="18" height="18" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    lock: '<svg class="icon" width="16" height="16" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    unlock: '<svg class="icon" width="16" height="16" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>',
    edit: '<svg class="icon" width="16" height="16" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>'
  };

  // API Client — Интеграция с REST API (Лабораторная работа №3 и №4)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isFlaskServer = window.location.port === '5000';
  let API_HOST = localStorage.getItem('dmarket_api_host') || (isFlaskServer ? '' : (isLocalhost ? 'http://localhost:5000' : ''));

  // Pre-seeded fallback data for offline / cloud deployment (GitHub Pages, Vercel, Netlify)
  const DEMO_SEED_LISTINGS = [
    {
      id: 1,
      user_id: 2,
      category_id: 3,
      title: "MacBook Pro 14 M3 Space Gray",
      description: "16 ГБ RAM, 512 ГБ SSD. Состояние идеальное, батарея 98%, полный комплект с коробкой и зарядкой.",
      price: 899900,
      subcategory: "Ноутбуки и ПК",
      image: "https://images.unsplash.com/photo-1764533668787-5c0a9f565ea0?auto=format&fit=crop&w=1200&q=85",
      location: "Алматы, Бостандыкский район",
      seller: "Илья",
      phone: "+7 (705) 092-44-19",
      views: 153,
      date: "Сегодня",
      category: "Электроника"
    },
    {
      id: 2,
      user_id: 2,
      category_id: 2,
      title: "Шоссейный велосипед Carbon Road",
      description: "Легкая карбоновая рама, размер M. Навесное оборудование Shimano 105, новые покрышки Continental.",
      price: 380000,
      subcategory: "Мототехника",
      image: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=85",
      location: "Астана, Есильский район",
      seller: "Михаил",
      phone: "+7 (702) 174-08-51",
      views: 99,
      date: "Вчера",
      category: "Транспорт"
    },
    {
      id: 3,
      user_id: 2,
      category_id: 4,
      title: "Дизайнерский модульный диван Loop",
      description: "Буклированная мягкая ткань, глубокая посадка. Цвет айвори, покупали меньше года назад.",
      price: 450000,
      subcategory: "Мебель и интерьер",
      image: "https://images.unsplash.com/photo-1738168246881-40f35f8aba0a?auto=format&fit=crop&w=1200&q=85",
      location: "Алматы, Медеуский район",
      seller: "Анна",
      phone: "+7 (701) 248-16-32",
      views: 215,
      date: "2 дня назад",
      category: "Дом"
    },
    {
      id: 4,
      user_id: 2,
      category_id: 1,
      title: "Светлая 2-комнатная квартира у метро",
      description: "Дизайнерский ремонт, 64 кв.м, видовой этаж. Полностью меблирована, готова к заселению.",
      price: 450000,
      subcategory: "Квартиры",
      image: "https://images.unsplash.com/photo-1738168279272-c08d6dd22002?auto=format&fit=crop&w=1200&q=85",
      location: "Астана, район Алматы",
      seller: "Олег",
      phone: "+7 (708) 311-62-04",
      views: 310,
      date: "3 дня назад",
      category: "Недвижимость"
    },
    {
      id: 5,
      user_id: 2,
      category_id: 3,
      title: "Sony PlayStation 5 Slim 1TB",
      description: "Вторая ревизия, два геймпада DualSense, подписка PS Plus до конца года. Состояние нового.",
      price: 275000,
      subcategory: "Бытовая техника",
      image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=85",
      location: "Караганда",
      seller: "Дамир",
      phone: "+7 (707) 812-44-09",
      views: 180,
      date: "Сегодня",
      category: "Электроника"
    },
    {
      id: 6,
      user_id: 2,
      category_id: 6,
      title: "Предметная и lifestyle фотосъемка",
      description: "Съемка для маркетплейсов и каталогов. Обработка, цветокоррекция и ретушь в подарок.",
      price: 45000,
      subcategory: "Фото и видеосъемка",
      image: "https://images.unsplash.com/photo-1574611181386-394fe2237101?auto=format&fit=crop&w=1200&q=85",
      location: "Алматы",
      seller: "Настя",
      phone: "+7 (707) 063-27-80",
      views: 75,
      date: "Вчера",
      category: "Услуги"
    },
    {
      id: 7,
      user_id: 2,
      category_id: 4,
      title: "Прецизионная кофемолка Timemore C3",
      description: "Стальные конические жернова, идеальный помол для фильтра и эспрессо. Компактный корпус.",
      price: 39900,
      subcategory: "Посуда и текстиль",
      image: "https://images.unsplash.com/photo-1536505847234-1b7adfc33cdd?auto=format&fit=crop&w=1200&q=85",
      location: "Шымкент",
      seller: "Саша",
      phone: "+7 (747) 048-35-76",
      views: 56,
      date: "4 дня назад",
      category: "Дом"
    },
    {
      id: 8,
      user_id: 2,
      category_id: 5,
      title: "Винтажная кожаная куртка-косуха",
      description: "Натуральная телячья кожа, размер L. Итальянская фурнитура, стильный состаренный вид.",
      price: 68000,
      subcategory: "Мужская одежда",
      image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85",
      location: "Алматы",
      seller: "Артур",
      phone: "+7 (771) 902-11-22",
      views: 88,
      date: "Вчера",
      category: "Одежда и обувь"
    },
    {
      id: 16,
      user_id: 1,
      category_id: 3,
      title: "iPhone 15 Pro Max 512GB Blue Titanium",
      description: "Состояние нового, чек и гарантия. Проверено для Лабораторной работы.",
      price: 620000,
      subcategory: "Телефоны и аксессуары",
      image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=85",
      location: "Усть-Каменогорск",
      seller: "Данель Балтабаев",
      phone: "+7 (777) 064-82-63",
      views: 42,
      date: "Сегодня",
      category: "Электроника"
    }
  ];

  function getStoredListings() {
    try {
      const raw = localStorage.getItem('dmarket_listings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [...DEMO_SEED_LISTINGS];
  }

  function saveStoredListings(items) {
    try {
      localStorage.setItem('dmarket_listings', JSON.stringify(items));
    } catch (_) {}
  }

  // Autonomous / Offline fallback handler for GitHub Pages & Cloud hosting
  function handleOfflineFallback(action, options = {}) {
    const listings = getStoredListings();

    if (action === 'listings') {
      return { success: true, listings };
    }

    if (action === 'listing') {
      const id = Number(options.params?.id || options.id);
      const found = listings.find((item) => item.id === id) || listings[0];
      return { success: true, listing: found };
    }

    if (action === 'create_listing') {
      const body = options.body;
      let newTitle = 'Новое объявление';
      let newPrice = 0;
      let newCat = 'Электроника';
      let newSub = '';
      let newDesc = '';
      let newCity = 'Усть-Каменогорск';
      let newSeller = state.user?.name || 'Данель Балтабаев';
      let newPhone = state.user?.phone || '+77770648263';
      let newImg = '';

      if (body instanceof FormData) {
        newTitle = body.get('title') || newTitle;
        newPrice = Number(body.get('price')) || 0;
        newCat = body.get('category') || newCat;
        newSub = body.get('subcategory') || '';
        newDesc = body.get('description') || '';
        newCity = body.get('location') || newCity;
        newSeller = body.get('seller') || newSeller;
        newPhone = body.get('phone') || newPhone;

        const previewImg = document.querySelector('#ad-preview-content img');
        if (previewImg && previewImg.src && !previewImg.src.includes('data:image/svg')) {
          newImg = previewImg.src;
        } else if (body.get('image')) {
          newImg = body.get('image');
        }
      }

      const newListing = {
        id: Date.now(),
        user_id: state.user?.id || 1,
        title: newTitle,
        price: newPrice,
        category: newCat,
        subcategory: newSub,
        description: newDesc,
        location: newCity,
        seller: newSeller,
        phone: newPhone,
        image: newImg,
        views: 0,
        date: 'Только что'
      };

      const updated = [newListing, ...listings];
      saveStoredListings(updated);
      return { success: true, listing: newListing, message: 'Объявление успешно создано и опубликовано!' };
    }

    if (action === 'update_listing') {
      let editId = Number(options.params?.id || options.id);
      if (!editId && options.body instanceof FormData) {
        editId = Number(options.body.get('id'));
      }
      const idx = listings.findIndex((x) => x.id === editId);
      if (idx !== -1) {
        if (options.body instanceof FormData) {
          listings[idx].title = options.body.get('title') || listings[idx].title;
          listings[idx].price = Number(options.body.get('price')) || listings[idx].price;
          listings[idx].category = options.body.get('category') || listings[idx].category;
          listings[idx].subcategory = options.body.get('subcategory') || listings[idx].subcategory;
          listings[idx].description = options.body.get('description') || listings[idx].description;
          listings[idx].location = options.body.get('location') || listings[idx].location;
        }
        saveStoredListings(listings);
        return { success: true, listing: listings[idx], message: 'Объявление успешно обновлено!' };
      }
      return { success: true, listing: listings[0], message: 'Объявление обновлено!' };
    }

    if (action === 'delete_listing') {
      let delId = Number(options.params?.id || options.id);
      if (!delId && options.body instanceof FormData) {
        delId = Number(options.body.get('id'));
      }
      const filtered = listings.filter((x) => x.id !== delId);
      saveStoredListings(filtered);
      return { success: true, message: 'Объявление удалено!' };
    }

    if (action === 'categories') {
      return {
        success: true,
        categories: [
          { id: 1, name: 'Недвижимость', slug: 'real-estate' },
          { id: 2, name: 'Транспорт', slug: 'transport' },
          { id: 3, name: 'Электроника', slug: 'electronics' },
          { id: 4, name: 'Дом', slug: 'home' },
          { id: 5, name: 'Одежда и обувь', slug: 'fashion' },
          { id: 6, name: 'Услуги', slug: 'services' }
        ]
      };
    }

    if (action === 'me') {
      return { success: true, user: state.user || null, favorites: Array.from(state.favorites), unreadCount: 0 };
    }

    if (action === 'login') {
      const loginVal = options.body instanceof FormData ? options.body.get('login') : 'admin';
      const isAdminLogin = loginVal === 'admin';
      const userObj = {
        id: isAdminLogin ? 1 : 2,
        login: loginVal || 'admin',
        name: isAdminLogin ? 'Администратор' : 'Пользователь',
        role: isAdminLogin ? 'admin' : 'user',
        is_admin: isAdminLogin ? 1 : 0
      };
      state.user = userObj;
      return { success: true, user: userObj, message: 'Успешный вход в систему!' };
    }

    if (action === 'register') {
      const nameVal = options.body instanceof FormData ? options.body.get('name') : 'Новый пользователь';
      const userObj = { id: Date.now(), login: 'user_' + Date.now(), name: nameVal, role: 'user', is_admin: 0 };
      state.user = userObj;
      return { success: true, user: userObj, message: 'Регистрация успешна!' };
    }

    if (action === 'logout') {
      state.user = null;
      return { success: true };
    }

    if (action === 'toggle_favorite') {
      return { success: true, is_favorite: true };
    }

    return { success: true };
  }

  async function request(action, options = {}) {
    // 1. Попытка выполнить запрос через REST API Python Flask (порт 5000 или облачный хостинг)
    try {
      let url = null;
      let fetchConfig = { ...options };
      delete fetchConfig.params;

      if (action === 'listings') {
        url = `${API_HOST}/api/listings`;
        if (options.params) {
          const q = new URLSearchParams(options.params).toString();
          if (q) url += `?${q}`;
        }
      } else if (action === 'listing') {
        const id = options.params?.id || options.id;
        url = `${API_HOST}/api/listings/${id}`;
      } else if (action === 'create_listing') {
        url = `${API_HOST}/api/listings`;
        fetchConfig.method = 'POST';
      } else if (action === 'update_listing') {
        let editId = options.params?.id || options.id;
        if (!editId && options.body instanceof FormData) {
          editId = options.body.get('id');
        }
        url = `${API_HOST}/api/listings/${editId}`;
        fetchConfig.method = 'PUT';
      } else if (action === 'delete_listing') {
        let delId = options.params?.id || options.id;
        if (!delId && options.body instanceof FormData) {
          delId = options.body.get('id');
        }
        url = `${API_HOST}/api/listings/${delId}`;
        fetchConfig.method = 'DELETE';
      } else if (action === 'categories') {
        url = `${API_HOST}/api/categories`;
      } else if (action === 'me') {
        url = `${API_HOST}/api/auth/me`;
      } else if (action === 'login') {
        url = `${API_HOST}/api/auth/login`;
        fetchConfig.method = 'POST';
      } else if (action === 'register') {
        url = `${API_HOST}/api/auth/register`;
        fetchConfig.method = 'POST';
      } else if (action === 'logout') {
        url = `${API_HOST}/api/auth/logout`;
        fetchConfig.method = 'POST';
      } else if (action === 'toggle_favorite') {
        url = `${API_HOST}/api/favorites/toggle`;
        fetchConfig.method = 'POST';
      }

      if (url) {
        try {
          const res = await fetch(url, fetchConfig);
          if (res.ok) {
            const cType = res.headers.get('content-type') || '';
            if (cType.includes('application/json')) {
              const data = await res.json();
              if (data.success !== false && data.status !== 'error') {
                return data;
              }
              if (data.error) {
                throw new Error(data.error);
              }
            }
          }
        } catch (fetchErr) {
          console.warn(`[REST API] Прямой запрос к серверу не удался (${fetchErr.message}). Переход на автономный режим.`);
        }

        // Если сайт открыт на статическом хостинге (Vercel) без работающего бэкенда или сервер недоступен,
        // бесшовно используем автономный демонстрационный движок с сохранением в localStorage
        return handleOfflineFallback(action, options);
      }
    } catch (flaskErr) {
      console.warn(`[REST API] API недоступен (${flaskErr.message}), используем резервный режим.`);
    }

    // 2. Резервный маршрут на api.php (если работаем в связке с XAMPP)
    try {
      let phpUrl = `api.php?action=${encodeURIComponent(action)}`;
      if (options.params) {
        const q = new URLSearchParams(options.params).toString();
        if (q) phpUrl += `&${q}`;
      }
      const phpConfig = { credentials: 'same-origin', ...options };
      delete phpConfig.params;

      const phpRes = await fetch(phpUrl, phpConfig);
      if (phpRes.ok) {
        const phpData = await phpRes.json();
        if (phpData.success) {
          return phpData;
        }
      }
    } catch (phpErr) {
      // Игнорируем ошибку PHP на GitHub Pages / Vercel
    }

    // 3. Автономный режим (для GitHub Pages, Vercel, Netlify и работы без активного локального сервера)
    return handleOfflineFallback(action, options);
  }

  // Toast Notification (Лабораторная работа №4 — выплывающие уведомления с типами)
  let toastTimer = null;
  function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';

    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span style="font-size:16px; margin-right:6px;">${icon}</span> <span>${escapeHtml(message)}</span>`;
    toast.style.display = 'inline-flex';

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  // Helpers
  function formatPrice(num) {
    return Number(num).toLocaleString('ru-RU') + ' ₸';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // DOM Elements
  const headerActionsEl = document.getElementById('header-actions');
  const screens = {
    home: document.getElementById('screen-home'),
    detail: document.getElementById('screen-detail'),
    add: document.getElementById('screen-add'),
    favorites: document.getElementById('screen-favorites'),
    messages: document.getElementById('screen-messages'),
    account: document.getElementById('screen-account'),
    'admin-users': document.getElementById('screen-admin-users')
  };
  const modalContainerEl = document.getElementById('modal-container');
  const lightboxContainerEl = document.getElementById('lightbox-container');

  function stopChatPolling() {
    if (state.chatPollInterval) {
      clearInterval(state.chatPollInterval);
      state.chatPollInterval = null;
    }
  }

  // Navigation & Screen Management
  function navigate(screenName) {
    if (state.screen !== 'messages' || screenName !== 'messages') {
      stopChatPolling();
    }
    closeLightbox();
    state.screen = screenName;
    Object.keys(screens).forEach((key) => {
      if (screens[key]) {
        screens[key].style.display = key === screenName ? 'block' : 'none';
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (screenName === 'home') renderCatalog();
    if (screenName === 'favorites') renderFavoritesScreen();
    if (screenName === 'messages') renderMessagesScreen();
    if (screenName === 'account') renderAccountScreen();
    if (screenName === 'admin-users') renderAdminUsersScreen();
  }

  // Header Rendering
  function renderHeader() {
    const favCount = state.favorites.size;
    const isLogged = !!state.user;
    const isAdmin = isLogged && state.user.role === 'admin';
    const unread = state.unreadMessagesCount;

    let html = `
      <button class="button ghost-button desktop-only" id="btn-nav-favorites">
        ${icons.heart} Избранное ${favCount > 0 ? `<span class="nav-count">${favCount}</span>` : ''}
      </button>
    `;

    if (isLogged) {
      html += `
        <button class="button ghost-button messages-button" id="btn-nav-messages">
          ${icons.message} <span class="messages-label">Сообщения</span>
          ${unread > 0 ? `<span class="nav-count">${unread}</span>` : ''}
        </button>
      `;

      if (isAdmin) {
        const restApiUrl = (isLocalhost && !isFlaskServer) ? 'http://localhost:5000/dashboard' : '/dashboard';
        html += `
          <button class="button ghost-button admin-header-btn desktop-only" id="btn-nav-admin" title="Управление профилями клиентов">
            ${icons.users} <span>Клиенты</span><span class="admin-badge">Админ</span>
          </button>
          <a href="${restApiUrl}" id="btn-nav-restapi" class="button api-header-btn" target="_blank" title="Панель REST API (Лабораторная 3)" style="background:#0f172a; color:#38bdf8; border:1px solid #38bdf8; border-radius:999px; padding:6px 14px; font-weight:800; font-size:12px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e;"></span>
            <span>REST API (Лаб 3)</span>
          </a>
        `;
      }
    }

    if (!isLogged) {
      html += `
        <button class="button auth-link wide-only" id="btn-nav-login">Войти</button>
        <button class="button auth-link wide-only" id="btn-nav-register">Регистрация</button>
      `;
    }

    html += `
      <button class="button primary-button add-button" id="btn-nav-add">
        ${icons.plus} <span class="add-label">Подать объявление</span>
      </button>
      <button class="button avatar-button" id="btn-nav-account" aria-label="Личный кабинет" title="${isLogged ? state.user.name : 'Войти'}">
        ${
          isLogged && state.user.avatar
            ? `<img src="${escapeHtml(state.user.avatar)}" alt="" />`
            : isLogged
            ? `<span>${escapeHtml(state.user.name[0].toUpperCase())}</span>`
            : icons.user
        }
      </button>
    `;

    if (isLogged) {
      html += `<button class="button header-logout" id="btn-nav-logout">Выйти</button>`;
    }

    headerActionsEl.innerHTML = html;

    // Attach Listeners
    document.getElementById('btn-nav-favorites')?.addEventListener('click', () => navigate('favorites'));
    document.getElementById('btn-nav-messages')?.addEventListener('click', () => {
      state.activeChat = null;
      navigate('messages');
    });
    document.getElementById('btn-nav-admin')?.addEventListener('click', () => navigate('admin-users'));
    document.getElementById('btn-nav-restapi')?.addEventListener('click', (e) => {
      e.preventDefault();
      let targetUrl = '/dashboard';
      if (isLocalhost && !isFlaskServer) {
        targetUrl = 'http://localhost:5000/dashboard';
      }
      window.open(targetUrl, '_blank');
    });
    document.getElementById('btn-nav-login')?.addEventListener('click', () => openModal('login'));
    document.getElementById('btn-nav-register')?.addEventListener('click', () => openModal('register'));
    document.getElementById('btn-nav-add')?.addEventListener('click', () => {
      if (!state.user) {
        openModal('register');
        showToast('Создайте аккаунт, чтобы подать объявление');
      } else {
        resetAddListingForm();
        navigate('add');
      }
    });
    document.getElementById('btn-nav-account')?.addEventListener('click', () => {
      if (!state.user) {
        openModal('login');
      } else {
        navigate('account');
      }
    });
    document.getElementById('btn-nav-logout')?.addEventListener('click', logout);
  }

  // Render Listing Card Component
  function renderCard(listing) {
    const isFav = state.favorites.has(listing.id);
    const hasPhoto = Boolean(listing.image && !listing.image.includes('photo-1523275335684'));
    const photosCount = listing.images && listing.images.length ? listing.images.length : (hasPhoto ? 1 : 0);
    const imgHtml = hasPhoto
      ? `<img class="card-image" src="${escapeHtml(listing.image)}" alt="${escapeHtml(listing.title)}" loading="lazy" />`
      : `<div class="card-image card-no-photo" style="display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f1f5f9; color:#94a3b8; font-size:12.5px; font-weight:700; gap:6px; min-height:180px;">
           <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
           <span>Без фото</span>
         </div>`;

    return `
      <article class="card" data-id="${listing.id}">
        <div class="card-image-wrap">
          ${imgHtml}
          <button class="button favorite ${isFav ? 'favorite-active' : ''}" data-fav-id="${listing.id}" aria-label="В избранное">
            ${icons.heart}
          </button>
          <span class="category-badge">${escapeHtml(listing.category)}</span>
          ${listing.subcategory ? `<span class="subcategory-badge">${escapeHtml(listing.subcategory)}</span>` : ''}
          ${photosCount > 1 ? `<span class="photos-count-badge">${photosCount} фото</span>` : ''}
        </div>
        <div class="card-content">
          <div class="card-title">${escapeHtml(listing.title)}</div>
          <div class="price">${formatPrice(listing.price)}</div>
          <div class="card-meta">
            <span>${escapeHtml(listing.location)}</span>
            <span>${escapeHtml(listing.date)}</span>
          </div>
        </div>
      </article>
    `;
  }

  // Render Catalog on Home Screen
  function renderCatalog() {
    // 1. Render Category Chips
    const chipsEl = document.getElementById('category-chips');
    if (chipsEl) {
      chipsEl.innerHTML = categories.map((cat) => `
        <button class="button chip ${state.category === cat ? 'chip-active' : ''}" data-cat="${cat}">${cat}</button>
      `).join('');

      chipsEl.querySelectorAll('.chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          const selectedCat = btn.getAttribute('data-cat');
          state.category = selectedCat;
          state.subcategory = 'Все';
          state.filters.category = selectedCat;
          state.filters.subcategory = 'Все';
          
          const catSelect = document.getElementById('filter-category');
          if (catSelect) catSelect.value = selectedCat;
          updateFilterSubcategories();

          updateActiveFilterBadge();
          renderCatalog();
        });
      });
    }

    // 2. Render Subcategory Chips if specific category selected
    const subchipsEl = document.getElementById('subcategory-chips');
    if (subchipsEl) {
      if (state.category !== 'Все' && categoryMap[state.category]) {
        const subList = ['Все подкатегории', ...categoryMap[state.category]];
        subchipsEl.style.display = 'flex';
        subchipsEl.innerHTML = subList.map((sub) => {
          const isActive = (state.subcategory === sub) || (sub === 'Все подкатегории' && (state.subcategory === 'Все' || !state.subcategory));
          return `<button class="subchip ${isActive ? 'subchip-active' : ''}" data-sub="${sub}">${sub}</button>`;
        }).join('');

        subchipsEl.querySelectorAll('.subchip').forEach((btn) => {
          btn.addEventListener('click', () => {
            const chosenSub = btn.getAttribute('data-sub');
            state.subcategory = chosenSub === 'Все подкатегории' ? 'Все' : chosenSub;
            state.filters.subcategory = state.subcategory;
            const subSelect = document.getElementById('filter-subcategory');
            if (subSelect) subSelect.value = state.subcategory;
            updateActiveFilterBadge();
            renderCatalog();
          });
        });
      } else {
        subchipsEl.style.display = 'none';
      }
    }

    // 3. Filter listings based on active search, category, subcategory, prices, location, only_photo
    const filtered = state.listings.filter((item) => {
      // Category match
      if (state.category !== 'Все' && item.category !== state.category) return false;
      
      // Subcategory match
      if (state.subcategory !== 'Все' && state.subcategory !== 'Все подкатегории' && item.subcategory && item.subcategory !== state.subcategory) return false;

      // Text query match
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inDesc = item.description.toLowerCase().includes(q);
        const inSub = item.subcategory && item.subcategory.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inSub) return false;
      }

      // Min price
      if (state.filters.minPrice !== '' && !isNaN(Number(state.filters.minPrice))) {
        if (item.price < Number(state.filters.minPrice)) return false;
      }

      // Max price
      if (state.filters.maxPrice !== '' && !isNaN(Number(state.filters.maxPrice))) {
        if (item.price > Number(state.filters.maxPrice)) return false;
      }

      // Location match
      if (state.filters.location && state.filters.location !== 'Все' && state.filters.location !== 'Все города') {
        if (!item.location.toLowerCase().includes(state.filters.location.toLowerCase())) return false;
      }

      // Only with photo match
      if (state.filters.onlyPhoto) {
        if (!item.image || item.image.includes('data:image/svg')) return false;
      }

      return true;
    });

    // 4. Sort filtered listings
    filtered.sort((a, b) => {
      if (state.filters.sort === 'price_asc') return a.price - b.price;
      if (state.filters.sort === 'price_desc') return b.price - a.price;
      if (state.filters.sort === 'views') return b.views - a.views;
      return b.id - a.id; // newest default
    });

    // 5. Update catalog count & active tags
    const countEl = document.getElementById('catalog-count');
    if (countEl) countEl.textContent = `${filtered.length} предложений найдено`;

    renderActiveFilterTags();

    // 6. Render Grid
    const gridEl = document.getElementById('catalog-grid');
    if (!gridEl) return;

    if (filtered.length > 0) {
      gridEl.className = 'grid';
      gridEl.innerHTML = filtered.map(renderCard).join('');

      gridEl.querySelectorAll('.card').forEach((card) => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.favorite')) return;
          const id = Number(card.getAttribute('data-id'));
          openDetail(id);
        });
      });

      gridEl.querySelectorAll('.favorite').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = Number(btn.getAttribute('data-fav-id'));
          toggleFavorite(id);
        });
      });
    } else {
      gridEl.className = '';
      gridEl.innerHTML = `
        <div class="empty">
          <div class="empty-icon">${icons.search}</div>
          <div class="empty-title">Ничего не найдено</div>
          <p>Попробуйте скорректировать параметры поиска или сбросить фильтры.</p>
          <button class="button primary-button empty-action" id="btn-empty-reset">Сбросить фильтры</button>
        </div>
      `;
      document.getElementById('btn-empty-reset')?.addEventListener('click', resetAllFilters);
    }
  }

  // Active Filter Tags Indicator
  function renderActiveFilterTags() {
    const tagsContainer = document.getElementById('active-filter-tags');
    if (!tagsContainer) return;

    const tags = [];
    if (state.category !== 'Все') {
      tags.push({ label: `Категория: ${state.category}`, clear: () => { state.category = 'Все'; state.subcategory = 'Все'; } });
    }
    if (state.subcategory !== 'Все' && state.subcategory !== 'Все подкатегории') {
      tags.push({ label: `Подкатегория: ${state.subcategory}`, clear: () => { state.subcategory = 'Все'; } });
    }
    if (state.filters.minPrice) {
      tags.push({ label: `От ${Number(state.filters.minPrice).toLocaleString()} ₸`, clear: () => { state.filters.minPrice = ''; document.getElementById('filter-min-price').value = ''; } });
    }
    if (state.filters.maxPrice) {
      tags.push({ label: `До ${Number(state.filters.maxPrice).toLocaleString()} ₸`, clear: () => { state.filters.maxPrice = ''; document.getElementById('filter-max-price').value = ''; } });
    }
    if (state.filters.location && state.filters.location !== 'Все') {
      tags.push({ label: `Город: ${state.filters.location}`, clear: () => { state.filters.location = 'Все'; document.getElementById('filter-location').value = 'Все'; } });
    }
    if (state.filters.onlyPhoto) {
      tags.push({ label: 'Только с фото', clear: () => { state.filters.onlyPhoto = false; document.getElementById('filter-only-photo').checked = false; } });
    }

    if (tags.length === 0) {
      tagsContainer.innerHTML = '';
      return;
    }

    tagsContainer.innerHTML = tags.map((t, idx) => `
      <span class="filter-tag" data-tag-idx="${idx}">
        ${escapeHtml(t.label)}
        <span class="filter-tag-remove">&times;</span>
      </span>
    `).join('');

    tagsContainer.querySelectorAll('.filter-tag').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.getAttribute('data-tag-idx'));
        if (tags[idx]) {
          tags[idx].clear();
          updateActiveFilterBadge();
          renderCatalog();
        }
      });
    });
  }

  // Update badge showing count of active filters
  function updateActiveFilterBadge() {
    const badge = document.getElementById('filter-badge');
    const toggleBtn = document.getElementById('btn-toggle-filters');
    let count = 0;
    if (state.category !== 'Все') count++;
    if (state.subcategory !== 'Все' && state.subcategory !== 'Все подкатегории') count++;
    if (state.filters.minPrice) count++;
    if (state.filters.maxPrice) count++;
    if (state.filters.location && state.filters.location !== 'Все') count++;
    if (state.filters.sort !== 'newest') count++;
    if (state.filters.onlyPhoto) count++;

    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
        toggleBtn?.classList.add('active');
      } else {
        badge.style.display = 'none';
        toggleBtn?.classList.remove('active');
      }
    }
  }

  // Update Subcategories dropdown in Advanced Filters based on chosen category
  function updateFilterSubcategories() {
    const subSelect = document.getElementById('filter-subcategory');
    if (!subSelect) return;

    const chosenCat = state.filters.category;
    if (chosenCat && categoryMap[chosenCat]) {
      const subs = categoryMap[chosenCat];
      subSelect.innerHTML = `<option value="Все">Все подкатегории</option>` + 
        subs.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    } else {
      subSelect.innerHTML = `<option value="Все">Все подкатегории</option>`;
    }
    subSelect.value = state.filters.subcategory || 'Все';
  }

  // Reset All Filters
  function resetAllFilters() {
    state.category = 'Все';
    state.subcategory = 'Все';
    state.searchQuery = '';
    state.filters = {
      category: 'Все',
      subcategory: 'Все',
      minPrice: '',
      maxPrice: '',
      location: 'Все',
      sort: 'newest',
      onlyPhoto: false
    };

    const qInput = document.getElementById('search-query');
    if (qInput) qInput.value = '';

    const catSelect = document.getElementById('filter-category');
    if (catSelect) catSelect.value = 'Все';

    const minP = document.getElementById('filter-min-price');
    if (minP) minP.value = '';

    const maxP = document.getElementById('filter-max-price');
    if (maxP) maxP.value = '';

    const locSelect = document.getElementById('filter-location');
    if (locSelect) locSelect.value = 'Все';

    const sortSelect = document.getElementById('filter-sort');
    if (sortSelect) sortSelect.value = 'newest';

    const onlyPhotoCheck = document.getElementById('filter-only-photo');
    if (onlyPhotoCheck) onlyPhotoCheck.checked = false;

    updateFilterSubcategories();
    updateActiveFilterBadge();
    renderCatalog();
    showToast('Фильтры сброшены');
  }

  // Setup Filters Event Listeners
  function setupFilters() {
    const toggleBtn = document.getElementById('btn-toggle-filters');
    const panel = document.getElementById('advanced-filters-panel');
    const closeBtn = document.getElementById('btn-close-filters');
    const applyBtn = document.getElementById('btn-apply-filters');
    const resetBtn = document.getElementById('btn-reset-filters');
    const catSelect = document.getElementById('filter-category');
    const subSelect = document.getElementById('filter-subcategory');

    toggleBtn?.addEventListener('click', () => {
      state.filtersVisible = !state.filtersVisible;
      if (panel) panel.style.display = state.filtersVisible ? 'block' : 'none';
      toggleBtn.classList.toggle('active', state.filtersVisible);
    });

    closeBtn?.addEventListener('click', () => {
      state.filtersVisible = false;
      if (panel) panel.style.display = 'none';
      toggleBtn?.classList.toggle('active', false);
    });

    catSelect?.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      state.filters.subcategory = 'Все';
      updateFilterSubcategories();
    });

    subSelect?.addEventListener('change', (e) => {
      state.filters.subcategory = e.target.value;
    });

    applyBtn?.addEventListener('click', () => {
      state.category = catSelect ? catSelect.value : 'Все';
      state.subcategory = subSelect ? subSelect.value : 'Все';
      state.filters.category = state.category;
      state.filters.subcategory = state.subcategory;
      state.filters.minPrice = document.getElementById('filter-min-price')?.value.trim() || '';
      state.filters.maxPrice = document.getElementById('filter-max-price')?.value.trim() || '';
      state.filters.location = document.getElementById('filter-location')?.value || 'Все';
      state.filters.sort = document.getElementById('filter-sort')?.value || 'newest';
      state.filters.onlyPhoto = document.getElementById('filter-only-photo')?.checked || false;

      updateActiveFilterBadge();
      renderCatalog();
      state.filtersVisible = false;
      if (panel) panel.style.display = 'none';
      showToast('Фильтры применены');
    });

    resetBtn?.addEventListener('click', resetAllFilters);
  }

  // Open Detail Screen
  async function openDetail(id) {
    let listing = state.listings.find((item) => item.id === id);
    if (!listing) {
      try {
        const res = await request('listing', { params: { id } });
        listing = res.listing;
      } catch (_) {
        showToast('Объявление не найдено');
        return;
      }
    }

    state.selectedListing = listing;
    state.activeSlideIndex = 0;
    navigate('detail');

    try {
      const res = await request('view', { method: 'POST', params: { id } });
      if (res.views) {
        listing.views = res.views;
      }
    } catch (_) {}

    renderDetailScreen();
  }

  // Render Detail Screen with Carousel and Fullscreen trigger
  function renderDetailScreen() {
    const listing = state.selectedListing;
    if (!listing) return;

    const rawImages = listing.images && listing.images.length ? listing.images : (listing.image ? [listing.image] : []);
    const images = rawImages.filter((img) => img && !img.includes('photo-1523275335684'));
    const hasImages = images.length > 0;
    const isFav = state.favorites.has(listing.id);
    const isOwner = state.user && (state.user.id === listing.ownerId || state.user.name === listing.seller);
    const isAdmin = state.user && state.user.role === 'admin';

    const container = document.getElementById('detail-content');
    if (!container) return;

    const currentImgUrl = hasImages ? (images[state.activeSlideIndex] || images[0]) : '';

    container.innerHTML = `
      <button class="button back-button" id="btn-detail-back">${icons.arrow} Все объявления</button>
      <div class="detail-layout">
        <div>
          <!-- Photo Carousel / Placeholder -->
          ${hasImages ? `
          <div class="detail-carousel" id="detail-carousel">
            <div class="carousel-stage" id="carousel-main-stage" title="Нажмите, чтобы развернуть во весь экран (как на OLX)">
              <img src="${escapeHtml(currentImgUrl)}" alt="${escapeHtml(listing.title)}" id="carousel-main-img" />
              <span class="carousel-counter-badge" id="carousel-counter">${state.activeSlideIndex + 1} / ${images.length}</span>
              <span class="carousel-overlay-hint">${icons.maximize} На весь экран</span>

              ${images.length > 1 ? `
                <button class="carousel-arrow carousel-arrow-prev" id="btn-carousel-prev" type="button" aria-label="Предыдущее фото">
                  ${icons.arrow}
                </button>
                <button class="carousel-arrow carousel-arrow-next" id="btn-carousel-next" type="button" aria-label="Следующее фото" style="transform: translateY(-50%) rotate(180deg);">
                  ${icons.arrow}
                </button>
              ` : ''}
            </div>

            <!-- Carousel Thumbnails Strip -->
            ${images.length > 1 ? `
              <div class="carousel-thumbs" id="carousel-thumbs-row">
                ${images.map((img, idx) => `
                  <img class="carousel-thumb ${idx === state.activeSlideIndex ? 'active' : ''}" 
                       src="${escapeHtml(img)}" 
                       data-thumb-idx="${idx}" 
                       alt="Фото ${idx + 1}" />
                `).join('')}
              </div>
            ` : ''}
          </div>
          ` : `
          <div class="detail-carousel" style="margin-bottom: 24px;">
            <div class="carousel-stage card-no-photo" style="background:#f1f5f9; color:#94a3b8; display:flex; flex-direction:column; align-items:center; justify-content:center; height:340px; border-radius:16px; gap:10px;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <span style="font-weight:700; font-size:15px;">Продавец не прикрепил фото</span>
            </div>
          </div>
          `}

          <div class="detail-mobile-title">
            <div class="badges-row">
              <span class="category-label">${escapeHtml(listing.category)}</span>
              ${listing.subcategory ? `<span class="subcategory-badge">${escapeHtml(listing.subcategory)}</span>` : ''}
            </div>
            <div class="detail-title">${escapeHtml(listing.title)}</div>
          </div>
          
          <div class="description-block">
            <div class="block-title">Описание</div>
            <p>${escapeHtml(listing.description)}</p>
            <p>Договориться о встрече или доставке можно через личные сообщения или по телефону.</p>
          </div>
        </div>

        <aside class="detail-sidebar">
          <div class="detail-desktop-title">
            <div class="badges-row">
              <span class="category-label">${escapeHtml(listing.category)}</span>
              ${listing.subcategory ? `<span class="subcategory-badge">${escapeHtml(listing.subcategory)}</span>` : ''}
            </div>
            <div class="detail-title">${escapeHtml(listing.title)}</div>
          </div>

          ${(isOwner || isAdmin) ? `<div class="owner-label">${isAdmin ? 'Режим модератора' : 'Ваше объявление'}</div>` : ''}

          <div class="detail-price">${formatPrice(listing.price)}</div>
          <div class="detail-meta">${icons.pin} ${escapeHtml(listing.location)}</div>
          <div class="detail-meta">${icons.clock} ${escapeHtml(listing.date)}</div>

          ${
            isOwner || isAdmin
              ? `
              <div class="owner-stats">
                <span>Просмотрено</span>
                <strong>${listing.views.toLocaleString('ru-RU')}</strong>
              </div>
              <button class="button primary-button full-button" id="btn-detail-edit">
                ${icons.edit} Редактировать объявление
              </button>
              <button class="button secondary-button full-button" id="btn-detail-manage">
                ${isAdmin ? 'Панель модератора' : 'Управлять в кабинете'}
              </button>
              <button class="button danger-button full-button" id="btn-detail-delete">
                ${isAdmin ? 'Удалить объявление (Админ)' : 'Снять с публикации'}
              </button>
            `
              : `
              <div class="seller-card">
                <div class="seller-avatar">${escapeHtml((listing.seller[0] || 'П').toUpperCase())}</div>
                <div>
                  <div class="seller-name">${escapeHtml(listing.seller)}</div>
                  <div class="seller-caption">На Д Маркете с 2026 года</div>
                </div>
              </div>
              <button class="button primary-button full-button" id="btn-detail-message">${icons.message} Написать продавцу</button>
              <button class="button secondary-button full-button" id="btn-detail-call">Позвонить</button>
              <div class="seller-phone" id="detail-phone-box" style="display: none;">
                Номер продавца: <strong><a href="tel:${escapeHtml(listing.phone)}">${escapeHtml(listing.phone || 'Номер не указан')}</a></strong>
              </div>
              <button class="button secondary-button full-button ${isFav ? 'favorite-button-active' : ''}" id="btn-detail-fav">
                ${icons.heart} ${isFav ? 'В избранном' : 'В избранное'}
              </button>
              <div class="safe-note">Не переводите предоплату до встречи. Проверяйте товар лично.</div>
            `
          }
        </aside>
      </div>
    `;

    // Carousel Navigation Listeners
    const mainStage = document.getElementById('carousel-main-stage');
    mainStage?.addEventListener('click', () => {
      openLightbox(state.activeSlideIndex);
    });

    document.getElementById('btn-carousel-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeSlideIndex = (state.activeSlideIndex - 1 + images.length) % images.length;
      updateCarouselUI(images);
    });

    document.getElementById('btn-carousel-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeSlideIndex = (state.activeSlideIndex + 1) % images.length;
      updateCarouselUI(images);
    });

    document.querySelectorAll('.carousel-thumb').forEach((thumb) => {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeSlideIndex = Number(thumb.getAttribute('data-thumb-idx'));
        updateCarouselUI(images);
      });
    });

    // Action listeners
    document.getElementById('btn-detail-back')?.addEventListener('click', () => navigate('home'));
    document.getElementById('btn-detail-edit')?.addEventListener('click', () => openEditListing(listing.id));
    document.getElementById('btn-detail-manage')?.addEventListener('click', () => navigate('account'));
    document.getElementById('btn-detail-delete')?.addEventListener('click', () => deleteListing(listing.id));
    document.getElementById('btn-detail-message')?.addEventListener('click', () => {
      if (!state.user) {
        openModal('login');
        showToast('Войдите, чтобы написать продавцу');
      } else {
        openChat(listing.id, listing.ownerId, listing.seller, listing.title, images[0]);
      }
    });
    document.getElementById('btn-detail-call')?.addEventListener('click', () => {
      const box = document.getElementById('detail-phone-box');
      if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('btn-detail-fav')?.addEventListener('click', () => {
      toggleFavorite(listing.id);
      renderDetailScreen();
    });
  }

  // Update Carousel Image & Active Thumbnail
  function updateCarouselUI(images) {
    const mainImg = document.getElementById('carousel-main-img');
    const counter = document.getElementById('carousel-counter');
    if (mainImg) mainImg.src = images[state.activeSlideIndex];
    if (counter) counter.textContent = `${state.activeSlideIndex + 1} / ${images.length}`;

    document.querySelectorAll('.carousel-thumb').forEach((thumb, idx) => {
      thumb.classList.toggle('active', idx === state.activeSlideIndex);
    });
  }

  // OLX-Style Fullscreen Lightbox
  function openLightbox(startIndex = 0) {
    const listing = state.selectedListing;
    if (!listing) return;

    const images = listing.images && listing.images.length ? listing.images : [listing.image];
    state.activeSlideIndex = startIndex;
    state.lightboxOpen = true;

    renderLightboxHTML(images, listing.title);

    // Keyboard navigation
    window.addEventListener('keydown', handleLightboxKeydown);
  }

  function renderLightboxHTML(images, title) {
    if (!lightboxContainerEl) return;

    lightboxContainerEl.innerHTML = `
      <div class="olx-lightbox" id="olx-lightbox-modal">
        <div class="lightbox-topbar">
          <div class="lightbox-counter" id="lightbox-counter-text">
            ${state.activeSlideIndex + 1} из ${images.length}
          </div>
          <div class="lightbox-title">${escapeHtml(title)}</div>
          <button class="lightbox-close-btn" id="btn-lightbox-close" title="Закрыть (Esc)">&times;</button>
        </div>

        <div class="lightbox-stage" id="lightbox-stage">
          ${images.length > 1 ? `
            <button class="lightbox-arrow lightbox-arrow-left" id="btn-lightbox-prev" title="Предыдущее фото (←)">
              ${icons.arrow}
            </button>
          ` : ''}

          <img class="lightbox-image" id="lightbox-main-img" src="${escapeHtml(images[state.activeSlideIndex])}" alt="" />

          ${images.length > 1 ? `
            <button class="lightbox-arrow lightbox-arrow-right" id="btn-lightbox-next" title="Следующее фото (→)" style="transform: translateY(-50%) rotate(180deg);">
              ${icons.arrow}
            </button>
          ` : ''}
        </div>

        ${images.length > 1 ? `
          <div class="lightbox-thumbs-bar">
            ${images.map((img, idx) => `
              <img class="lightbox-thumb ${idx === state.activeSlideIndex ? 'active' : ''}" 
                   src="${escapeHtml(img)}" 
                   data-lb-idx="${idx}" 
                   alt="" />
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('btn-lightbox-close')?.addEventListener('click', closeLightbox);

    document.getElementById('btn-lightbox-prev')?.addEventListener('click', () => {
      state.activeSlideIndex = (state.activeSlideIndex - 1 + images.length) % images.length;
      updateLightboxUI(images);
    });

    document.getElementById('btn-lightbox-next')?.addEventListener('click', () => {
      state.activeSlideIndex = (state.activeSlideIndex + 1) % images.length;
      updateLightboxUI(images);
    });

    document.querySelectorAll('.lightbox-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        state.activeSlideIndex = Number(thumb.getAttribute('data-lb-idx'));
        updateLightboxUI(images);
      });
    });

    // Touch swipe support for mobile
    let touchStartX = 0;
    const stage = document.getElementById('lightbox-stage');
    stage?.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    stage?.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          // Swipe right -> prev
          state.activeSlideIndex = (state.activeSlideIndex - 1 + images.length) % images.length;
        } else {
          // Swipe left -> next
          state.activeSlideIndex = (state.activeSlideIndex + 1) % images.length;
        }
        updateLightboxUI(images);
      }
    }, { passive: true });
  }

  function updateLightboxUI(images) {
    const imgEl = document.getElementById('lightbox-main-img');
    const counterEl = document.getElementById('lightbox-counter-text');
    if (imgEl) imgEl.src = images[state.activeSlideIndex];
    if (counterEl) counterEl.textContent = `${state.activeSlideIndex + 1} из ${images.length}`;

    document.querySelectorAll('.lightbox-thumb').forEach((t, idx) => {
      t.classList.toggle('active', idx === state.activeSlideIndex);
    });

    // Also sync the underlying carousel
    updateCarouselUI(images);
  }

  function handleLightboxKeydown(e) {
    if (!state.lightboxOpen || !state.selectedListing) return;
    const images = state.selectedListing.images && state.selectedListing.images.length 
      ? state.selectedListing.images 
      : [state.selectedListing.image];

    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      state.activeSlideIndex = (state.activeSlideIndex - 1 + images.length) % images.length;
      updateLightboxUI(images);
    } else if (e.key === 'ArrowRight') {
      state.activeSlideIndex = (state.activeSlideIndex + 1) % images.length;
      updateLightboxUI(images);
    }
  }

  function closeLightbox() {
    state.lightboxOpen = false;
    if (lightboxContainerEl) lightboxContainerEl.innerHTML = '';
    window.removeEventListener('keydown', handleLightboxKeydown);
  }

  // Open Chat Room
  function openChat(listingId, otherUserId, otherUserName, listingTitle, listingImage) {
    state.activeChat = {
      listingId,
      otherUserId: otherUserId ? Number(otherUserId) : 0,
      otherUserName: otherUserName || 'Продавец',
      listingTitle: listingTitle || 'Объявление',
      listingImage: listingImage || ''
    };
    navigate('messages');
  }

  // Render Favorites Screen
  function renderFavoritesScreen() {
    const container = document.getElementById('favorites-content');
    if (!container) return;

    const saved = state.listings.filter((item) => state.favorites.has(item.id));

    container.innerHTML = `
      <button class="button back-button" id="btn-fav-back">${icons.arrow} На главную</button>
      <div class="page-heading">
        <div class="eyebrow">Ваша подборка</div>
        <div class="form-title">Избранное</div>
        <p>${saved.length ? `${saved.length} сохранено в подборку` : 'Здесь появятся объявления, которые вы отметите сердцем.'}</p>
      </div>
      ${
        saved.length
          ? `<div class="grid" id="favorites-grid">${saved.map(renderCard).join('')}</div>`
          : `
          <div class="empty">
            <div class="empty-icon">${icons.heart}</div>
            <div class="empty-title">Пока ничего нет</div>
            <p>Нажмите на сердечко в карточке, чтобы сохранить объявление.</p>
            <button class="button primary-button empty-action" id="btn-fav-explore">Смотреть каталог</button>
          </div>
        `
      }
    `;

    document.getElementById('btn-fav-back')?.addEventListener('click', () => navigate('home'));
    document.getElementById('btn-fav-explore')?.addEventListener('click', () => navigate('home'));

    const grid = document.getElementById('favorites-grid');
    if (grid) {
      grid.querySelectorAll('.card').forEach((card) => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.favorite')) return;
          const id = Number(card.getAttribute('data-id'));
          openDetail(id);
        });
      });
      grid.querySelectorAll('.favorite').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = Number(btn.getAttribute('data-fav-id'));
          toggleFavorite(id);
          renderFavoritesScreen();
        });
      });
    }
  }

  // Render Messages Screen
  async function renderMessagesScreen() {
    const container = document.getElementById('messages-content');
    if (!container) return;

    if (!state.user) {
      navigate('home');
      openModal('login');
      return;
    }

    stopChatPolling();

    if (state.activeChat) {
      await renderChatThread(container);
      return;
    }

    container.innerHTML = `
      <button class="button back-button" id="btn-messages-back">${icons.arrow} На главную</button>
      <div class="page-heading">
        <div class="eyebrow">Общение с покупателями и продавцами</div>
        <div class="form-title">Сообщения</div>
        <p>Загрузка диалогов...</p>
      </div>
    `;

    document.getElementById('btn-messages-back')?.addEventListener('click', () => navigate('home'));

    try {
      const res = await request('chats');
      state.chats = res.chats || [];

      const totalUnread = state.chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      state.unreadMessagesCount = totalUnread;
      renderHeader();

      container.innerHTML = `
        <button class="button back-button" id="btn-messages-back">${icons.arrow} На главную</button>
        <div class="page-heading">
          <div class="eyebrow">Общение с покупателями и продавцами</div>
          <div class="form-title">Сообщения</div>
          <p>${state.chats.length ? `${state.chats.length} диалогов` : 'Здесь появятся ваши диалоги по объявлениям.'}</p>
        </div>
        ${
          state.chats.length
            ? `<div class="chats-list">
                ${state.chats.map((chat) => `
                  <article class="chat-item ${chat.unreadCount > 0 ? 'chat-item-unread' : ''}" 
                           data-listing-id="${chat.listingId}" 
                           data-other-id="${chat.otherUserId}" 
                           data-other-name="${escapeHtml(chat.otherUserName)}"
                           data-listing-title="${escapeHtml(chat.listingTitle)}"
                           data-listing-img="${escapeHtml(chat.listingImage)}">
                    <img class="chat-item-img" src="${escapeHtml(chat.listingImage)}" alt="" />
                    <div class="chat-item-body">
                      <div class="chat-item-top">
                        <span class="chat-item-partner">${escapeHtml(chat.otherUserName)}</span>
                        <span class="chat-item-time">${escapeHtml(chat.lastMessageTime)}</span>
                      </div>
                      <div class="chat-item-ad">${escapeHtml(chat.listingTitle)}</div>
                      <div class="chat-item-msg">${escapeHtml(chat.lastMessage)}</div>
                    </div>
                    ${chat.unreadCount > 0 ? `<span class="chat-unread-badge">${chat.unreadCount}</span>` : ''}
                  </article>
                `).join('')}
              </div>`
            : `
              <div class="empty">
                <div class="empty-icon">${icons.message}</div>
                <div class="empty-title">Сообщений пока нет</div>
                <p>Когда вы напишете продавцу или кто-то напишет по вашему объявлению, переписка отобразится здесь.</p>
                <button class="button primary-button empty-action" id="btn-chat-explore">Смотреть объявления</button>
              </div>
            `
        }
      `;

      document.getElementById('btn-messages-back')?.addEventListener('click', () => navigate('home'));
      document.getElementById('btn-chat-explore')?.addEventListener('click', () => navigate('home'));

      container.querySelectorAll('.chat-item').forEach((item) => {
        item.addEventListener('click', () => {
          const listingId = Number(item.getAttribute('data-listing-id'));
          const otherUserId = Number(item.getAttribute('data-other-id'));
          const otherUserName = item.getAttribute('data-other-name');
          const listingTitle = item.getAttribute('data-listing-title');
          const listingImage = item.getAttribute('data-listing-img');
          openChat(listingId, otherUserId, otherUserName, listingTitle, listingImage);
        });
      });
    } catch (err) {
      showToast(err.message);
    }
  }

  // Render Specific Chat Thread
  async function renderChatThread(container) {
    const chat = state.activeChat;
    if (!chat) return;

    container.innerHTML = `
      <button class="button back-button" id="btn-chat-back">${icons.arrow} Все диалоги</button>
      <div class="chat-thread-box">
        <div class="chat-thread-header">
          <div class="chat-header-info">
            <img class="chat-header-img" src="${escapeHtml(chat.listingImage)}" alt="" />
            <div>
              <div class="chat-header-title">${escapeHtml(chat.listingTitle)}</div>
              <div class="chat-header-subtitle">Диалог с: <strong>${escapeHtml(chat.otherUserName)}</strong></div>
            </div>
          </div>
          <button class="button ghost-button chat-view-ad-btn" id="btn-chat-view-ad">К объявлению</button>
        </div>

        <div class="chat-messages-scroll" id="chat-messages-container">
          <div class="chat-loading-text">Загрузка сообщений...</div>
        </div>

        <form class="chat-send-form" id="chat-send-form">
          <input class="field chat-input" id="chat-input-text" placeholder="Напишите сообщение..." autocomplete="off" required />
          <button class="button primary-button chat-send-btn" type="submit">
            ${icons.send} <span>Отправить</span>
          </button>
        </form>
      </div>
    `;

    document.getElementById('btn-chat-back')?.addEventListener('click', () => {
      stopChatPolling();
      state.activeChat = null;
      renderMessagesScreen();
    });

    document.getElementById('btn-chat-view-ad')?.addEventListener('click', () => {
      openDetail(chat.listingId);
    });

    const form = document.getElementById('chat-send-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input-text');
      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      const formData = new FormData();
      formData.append('listing_id', String(chat.listingId));
      formData.append('to_user_id', String(chat.otherUserId || ''));
      formData.append('text', text);

      try {
        await request('send_message', { method: 'POST', body: formData });
        await loadMessages(true);
      } catch (err) {
        showToast(err.message);
      }
    });

    async function loadMessages(scrollToBottom = false) {
      try {
        const res = await request('chat_messages', {
          params: { listing_id: chat.listingId, with_user_id: chat.otherUserId }
        });
        const msgContainer = document.getElementById('chat-messages-container');
        if (!msgContainer) return;

        const msgs = res.messages || [];
        if (msgs.length === 0) {
          msgContainer.innerHTML = `
            <div class="chat-empty-hint">
              ${icons.message}
              <p>Начните диалог первым — задайте интересующий вопрос о товаре или условиях покупки.</p>
            </div>
          `;
        } else {
          msgContainer.innerHTML = msgs.map((m) => {
            const isMine = m.fromId === state.user.id;
            return `
              <div class="bubble-row ${isMine ? 'bubble-mine' : 'bubble-theirs'}">
                <div class="bubble">
                  <div class="bubble-author">${escapeHtml(isMine ? 'Вы' : m.fromName)}</div>
                  <div class="bubble-text">${escapeHtml(m.text)}</div>
                  <div class="bubble-meta">
                    <span>${escapeHtml(m.time)}</span>
                    ${isMine ? `<span class="bubble-read-check">${m.read ? '✓✓' : '✓'}</span>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('');

          if (scrollToBottom) {
            msgContainer.scrollTop = msgContainer.scrollHeight;
          }
        }
      } catch (err) {
        console.warn('Poll error:', err);
      }
    }

    await loadMessages(true);

    // Poll for new incoming chat messages every 4 seconds
    stopChatPolling();
    state.chatPollInterval = setInterval(() => {
      if (state.screen === 'messages' && state.activeChat) {
        loadMessages(false);
      } else {
        stopChatPolling();
      }
    }, 4000);
  }

  // Render Account Screen
  function renderAccountScreen() {
    const container = document.getElementById('account-content');
    if (!container) return;

    if (!state.user) {
      navigate('home');
      openModal('login');
      return;
    }

    const myAds = state.listings.filter((item) => item.ownerId === state.user.id || item.seller === state.user.name);
    const isAdmin = state.user.role === 'admin';

    container.innerHTML = `
      <button class="button back-button" id="btn-account-back">${icons.arrow} На главную</button>
      <div class="account-card">
        <div class="account-hero">
          <div class="account-avatar">
            ${
              state.user.avatar
                ? `<img src="${escapeHtml(state.user.avatar)}" alt="" />`
                : `<span>${escapeHtml(state.user.name[0].toUpperCase())}</span>`
            }
          </div>
          <div>
            <div class="account-name">
              ${escapeHtml(state.user.name)}
              ${isAdmin ? '<span class="admin-badge">Администратор</span>' : ''}
            </div>
            <div class="account-login">Логин: @${escapeHtml(state.user.login)} ${state.user.phone ? `· Тел: ${escapeHtml(state.user.phone)}` : ''}</div>
          </div>
          <div class="account-actions">
            ${isAdmin ? `<button class="button primary-button" id="btn-account-admin-users">${icons.users} Управление клиентами</button>` : ''}
            <button class="button primary-button" id="btn-account-create">${icons.plus} Подать объявление</button>
            <button class="button ghost-button" id="btn-account-logout">Выйти</button>
          </div>
        </div>

        <div class="account-stats">
          <div>
            <span>Опубликовано</span>
            <strong>${myAds.length}</strong>
          </div>
          <div>
            <span>В избранном</span>
            <strong>${state.favorites.size}</strong>
          </div>
          <div>
            <span>Непрочитанных</span>
            <strong>${state.unreadMessagesCount}</strong>
          </div>
        </div>
      </div>

      <div class="section-heading" style="margin-top: 40px;">
        <h2 class="section-title">Ваши объявления</h2>
        <p class="section-copy">${myAds.length ? `Всего ${myAds.length} активных предложений` : 'Вы ещё не добавили ни одного объявления'}</p>
      </div>

      ${
        myAds.length
          ? `<div class="grid" id="account-grid">
              ${myAds.map((item) => `
                <div class="card-wrapper">
                  ${renderCard(item)}
                  <div class="card-management-bar">
                    <button class="button ghost-button card-edit-button" data-edit-id="${item.id}">
                      ${icons.edit} Редактировать
                    </button>
                    <button class="button danger-button card-delete-button" data-del-id="${item.id}">
                      Снять с публикации
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>`
          : `
          <div class="empty">
            <div class="empty-icon">${icons.plus}</div>
            <div class="empty-title">У вас пока нет объявлений</div>
            <p>Продайте ненужную вещь или предложите свои услуги жителям Казахстана.</p>
            <button class="button primary-button empty-action" id="btn-account-first-ad">Создать объявление</button>
          </div>
        `
      }
    `;

    document.getElementById('btn-account-back')?.addEventListener('click', () => navigate('home'));
    document.getElementById('btn-account-create')?.addEventListener('click', () => {
      resetAddListingForm();
      navigate('add');
    });
    document.getElementById('btn-account-first-ad')?.addEventListener('click', () => {
      resetAddListingForm();
      navigate('add');
    });
    document.getElementById('btn-account-admin-users')?.addEventListener('click', () => navigate('admin-users'));
    document.getElementById('btn-account-logout')?.addEventListener('click', logout);

    const grid = document.getElementById('account-grid');
    if (grid) {
      grid.querySelectorAll('.card').forEach((card) => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.favorite')) return;
          const id = Number(card.getAttribute('data-id'));
          openDetail(id);
        });
      });
      grid.querySelectorAll('.favorite').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = Number(btn.getAttribute('data-fav-id'));
          toggleFavorite(id);
          renderAccountScreen();
        });
      });
      grid.querySelectorAll('.card-edit-button').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = Number(btn.getAttribute('data-edit-id'));
          openEditListing(id);
        });
      });
      grid.querySelectorAll('.card-delete-button').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = Number(btn.getAttribute('data-del-id'));
          deleteListing(id);
        });
      });
    }
  }

  // --- ADMIN USERS & CLIENT PROFILE MANAGEMENT SCREEN ---
  async function renderAdminUsersScreen() {
    const container = document.getElementById('admin-users-content');
    if (!container) return;

    if (!state.user || state.user.role !== 'admin') {
      showToast('Доступ запрещён: требуются права администратора');
      navigate('home');
      return;
    }

    container.innerHTML = `
      <button class="button back-button" id="btn-admin-back">${icons.arrow} В личный кабинет</button>
      <div class="admin-header-row">
        <div>
          <div class="eyebrow">Панель управления</div>
          <div class="form-title">Профили клиентов и модерация</div>
          <p>Изменяйте данные клиентов, восстанавливайте доступ, сбрасывайте пароли и управляйте блокировкой.</p>
        </div>
        <button class="button secondary-button" id="btn-admin-refresh">Обновить список</button>
      </div>

      <div class="admin-users-table-wrap" id="admin-table-container">
        <div style="padding: 30px; text-align: center; color: var(--muted);">Загрузка списка клиентов...</div>
      </div>
    `;

    document.getElementById('btn-admin-back')?.addEventListener('click', () => navigate('account'));
    document.getElementById('btn-admin-refresh')?.addEventListener('click', renderAdminUsersScreen);

    try {
      const res = await request('admin_users');
      state.adminUsers = res.users || [];
      const tableWrap = document.getElementById('admin-table-container');
      if (!tableWrap) return;

      if (state.adminUsers.length === 0) {
        tableWrap.innerHTML = `<div style="padding: 30px; text-align: center;">Клиентов в базе не найдено.</div>`;
        return;
      }

      tableWrap.innerHTML = `
        <table class="admin-users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Клиент</th>
              <th>Контакты / Телефон</th>
              <th>Роль</th>
              <th>Статус аккаунта</th>
              <th>Объявлений</th>
              <th>Дата регистрации</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${state.adminUsers.map((u) => {
              const isSelf = u.id === state.user.id;
              return `
                <tr data-user-id="${u.id}">
                  <td>#${u.id}</td>
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar-small">
                        ${u.avatar ? `<img src="${escapeHtml(u.avatar)}" alt="" />` : escapeHtml(u.name[0].toUpperCase())}
                      </div>
                      <div>
                        <div class="user-name-title">${escapeHtml(u.name)} ${isSelf ? '<span class="status-pill status-active">Вы</span>' : ''}</div>
                        <div class="user-login-sub">@${escapeHtml(u.login)}</div>
                      </div>
                    </div>
                  </td>
                  <td>${escapeHtml(u.phone || 'Не указан')}</td>
                  <td>
                    <span class="status-pill ${u.role === 'admin' ? 'status-active' : ''}">
                      ${u.role === 'admin' ? 'Администратор' : 'Пользователь'}
                    </span>
                  </td>
                  <td>
                    <span class="status-pill ${u.isBlocked ? 'status-blocked' : 'status-active'}">
                      ${u.isBlocked ? 'Заблокирован' : 'Активен'}
                    </span>
                  </td>
                  <td><strong>${u.listingsCount}</strong></td>
                  <td style="color: var(--muted);">${escapeHtml(u.registeredAt)}</td>
                  <td>
                    <div class="admin-actions-cell">
                      <button class="button secondary-button admin-btn-sm btn-admin-edit" data-id="${u.id}">
                        ${icons.edit} Изменить
                      </button>
                      ${!isSelf ? `
                        <button class="button ${u.isBlocked ? 'primary-button' : 'danger-button'} admin-btn-sm btn-admin-toggle-block" data-id="${u.id}">
                          ${u.isBlocked ? `${icons.unlock} Восстановить` : `${icons.lock} Блокировать`}
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      // Attach actions listeners
      tableWrap.querySelectorAll('.btn-admin-edit').forEach((btn) => {
        btn.addEventListener('click', () => {
          const uId = Number(btn.getAttribute('data-id'));
          const target = state.adminUsers.find((x) => x.id === uId);
          if (target) {
            state.editingAdminUser = target;
            openModal('admin_edit_user');
          }
        });
      });

      tableWrap.querySelectorAll('.btn-admin-toggle-block').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const uId = Number(btn.getAttribute('data-id'));
          const target = state.adminUsers.find((x) => x.id === uId);
          if (!target) return;

          const actionWord = target.isBlocked ? 'восстановить и разблокировать' : 'заблокировать';
          if (!confirm(`Вы уверены, что хотите ${actionWord} профиль клиента «${target.name}»?`)) return;

          try {
            const formData = new FormData();
            formData.append('user_id', String(uId));
            const res = await request('admin_toggle_user_block', { method: 'POST', body: formData });
            showToast(res.message);
            renderAdminUsersScreen();
          } catch (err) {
            showToast(err.message);
          }
        });
      });
    } catch (err) {
      showToast(err.message);
    }
  }

  // Open Listing in Edit Mode
  function openEditListing(id) {
    const listing = state.listings.find((item) => item.id === id);
    if (!listing) return;

    const form = document.getElementById('form-add-listing');
    const previewContent = document.getElementById('ad-preview-content');
    const uploadLabel = document.getElementById('ad-upload-label');
    const formHeading = document.querySelector('#screen-add .form-heading');
    const submitBtn = document.getElementById('btn-add-submit');
    const catSelect = document.getElementById('ad-category');
    const subSelect = document.getElementById('ad-subcategory');

    if (!form) return;

    form.setAttribute('data-edit-id', String(listing.id));
    form.querySelector('input[name="title"]').value = listing.title;
    
    if (catSelect) {
      catSelect.value = listing.category;
      updateAdSubcategories(listing.category, listing.subcategory);
    }
    
    form.querySelector('textarea[name="description"]').value = listing.description;
    form.querySelector('input[name="price"]').value = listing.price;
    form.querySelector('input[name="location"]').value = listing.location;
    form.querySelector('input[name="phone"]').value = listing.phone || '';

    if (formHeading) {
      formHeading.innerHTML = `
        <div class="eyebrow">Редактирование</div>
        <h2 class="form-title">Изменить объявление</h2>
        <p>Вы можете обновить подкатегорию, описание, цену, контакты или загрузить новые фотографии.</p>
      `;
    }

    if (submitBtn) {
      submitBtn.textContent = 'Сохранить изменения';
    }

    if (previewContent && listing.image) {
      previewContent.innerHTML = `<img src="${escapeHtml(listing.image)}" alt="Текущее фото" />`;
      uploadLabel?.classList.add('has-preview');
    }

    navigate('add');
  }

  // Update Subcategories for Add Listing form
  function updateAdSubcategories(selectedCategory, preselectedValue = '') {
    const subSelect = document.getElementById('ad-subcategory');
    if (!subSelect) return;

    if (selectedCategory && categoryMap[selectedCategory]) {
      const list = categoryMap[selectedCategory];
      subSelect.innerHTML = `<option value="">Выберите подкатегорию (необязательно)</option>` + 
        list.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
      if (preselectedValue) {
        subSelect.value = preselectedValue;
      }
    } else {
      subSelect.innerHTML = `<option value="">Выберите категорию выше</option>`;
    }
  }

  // Reset Add Listing Form to creation mode
  function resetAddListingForm() {
    const form = document.getElementById('form-add-listing');
    const previewContent = document.getElementById('ad-preview-content');
    const multiThumbs = document.getElementById('ad-multi-thumbs');
    const uploadLabel = document.getElementById('ad-upload-label');
    const formHeading = document.querySelector('#screen-add .form-heading');
    const submitBtn = document.getElementById('btn-add-submit');
    const subSelect = document.getElementById('ad-subcategory');

    if (!form) return;

    form.removeAttribute('data-edit-id');
    form.reset();

    if (subSelect) {
      subSelect.innerHTML = `<option value="">Выберите категорию выше</option>`;
    }

    if (formHeading) {
      formHeading.innerHTML = `
        <div class="eyebrow">Новое объявление</div>
        <h2 class="form-title">Расскажите, что предлагаете</h2>
        <p>Чем подробнее описание и чётче фото, тем быстрее найдётся покупатель.</p>
      `;
    }

    if (submitBtn) {
      submitBtn.textContent = 'Опубликовать объявление';
    }

    if (previewContent) {
      previewContent.innerHTML = `
        <span class="upload-icon">${icons.upload}</span>
        <span class="upload-title">Нажмите или перетащите фотографии</span>
        <span class="field-hint">JPG, PNG, WEBP до 10 МБ. Первая фотография будет главной обложкой.</span>
      `;
    }
    if (multiThumbs) {
      multiThumbs.style.display = 'none';
      multiThumbs.innerHTML = '';
    }
    uploadLabel?.classList.remove('has-preview');
  }

  // Toggle Favorite
  async function toggleFavorite(id) {
    if (!state.user) {
      openModal('login');
      showToast('Войдите, чтобы сохранять в избранное');
      return;
    }

    try {
      const res = await request('toggle_favorite', { method: 'POST', params: { id } });
      state.favorites = new Set(res.favorites || []);
      renderHeader();
      renderCatalog();
      showToast(res.message || 'Избранное обновлено');
    } catch (err) {
      showToast(err.message);
    }
  }

  // Delete Listing
  async function deleteListing(id) {
    if (!confirm('Вы уверены, что хотите снять это объявление с публикации?')) return;

    try {
      const res = await request('delete_listing', { method: 'POST', params: { id } });
      state.listings = state.listings.filter((item) => item.id !== id);
      state.favorites.delete(id);
      showToast(res.message || 'Объявление удалено');
      if (state.screen === 'detail') {
        navigate(state.user ? 'account' : 'home');
      } else {
        navigate(state.screen);
      }
    } catch (err) {
      showToast(err.message);
    }
  }

  // Modals Management
  function openModal(type) {
    state.modal = type;
    renderModal();
  }

  function closeModal() {
    state.modal = null;
    state.editingAdminUser = null;
    modalContainerEl.innerHTML = '';
  }

  function renderModal() {
    if (!state.modal) {
      modalContainerEl.innerHTML = '';
      return;
    }

    if (state.modal === 'login') {
      modalContainerEl.innerHTML = `
        <div class="modal-backdrop" id="modal-bg">
          <div class="modal-card">
            <button class="button modal-close" id="modal-close-btn">${icons.close}</button>
            <div class="eyebrow">С возвращением</div>
            <div class="modal-title">Войти в Д Маркет</div>
            <p>Управляйте своими объявлениями и общайтесь с покупателями.</p>
            <form class="auth-form" id="form-login">
              <div class="field-group">
                <span class="field-label">Логин</span>
                <input class="field" name="login" placeholder="Например, admin или user1" required autofocus />
              </div>
              <div class="field-group">
                <span class="field-label">Пароль</span>
                <input class="field" type="password" name="password" placeholder="Ваш пароль" required />
              </div>
              <div class="form-error" id="auth-error" style="display: none;"></div>
              <button class="button primary-button full-button auth-submit" type="submit">Войти</button>
            </form>
            <div class="modal-switch">
              Ещё нет аккаунта?
              <button class="button text-button" id="btn-switch-register">Регистрация</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('form-login').addEventListener('submit', handleLoginSubmit);
      document.getElementById('btn-switch-register').addEventListener('click', () => openModal('register'));
    } else if (state.modal === 'register') {
      modalContainerEl.innerHTML = `
        <div class="modal-backdrop" id="modal-bg">
          <div class="modal-card">
            <button class="button modal-close" id="modal-close-btn">${icons.close}</button>
            <div class="eyebrow">Добро пожаловать</div>
            <div class="modal-title">Создать аккаунт</div>
            <p>Публикуйте товары и сохраняйте интересные предложения.</p>
            <form class="auth-form" id="form-register">
              <label class="avatar-upload">
                <span class="avatar-preview" id="avatar-preview-box">${icons.user}</span>
                <span>
                  <strong>Фото профиля</strong>
                  <small>Нажмите, чтобы загрузить аватарку</small>
                </span>
                <input type="file" name="avatar" id="avatar-input" accept="image/*" />
              </label>
              <div class="field-group">
                <span class="field-label">Ваше имя</span>
                <input class="field" name="name" placeholder="Как вас зовут" required />
              </div>
              <div class="field-group">
                <span class="field-label">Логин</span>
                <input class="field" name="login" placeholder="Латинские буквы, например: user2" required minlength="3" />
                <span class="field-hint">Логин admin закреплен за администратором системы</span>
              </div>
              <div class="field-group">
                <span class="field-label">Контактный телефон</span>
                <input class="field" name="phone" type="tel" placeholder="+7 (700) 000-00-00" />
              </div>
              <div class="field-group">
                <span class="field-label">Пароль</span>
                <input class="field" type="password" name="password" placeholder="Минимум 6 символов" required minlength="6" />
              </div>
              <div class="form-error" id="auth-error" style="display: none;"></div>
              <button class="button primary-button full-button auth-submit" type="submit">Зарегистрироваться</button>
            </form>
            <div class="modal-switch">
              Уже есть аккаунт?
              <button class="button text-button" id="btn-switch-login">Войти</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('avatar-input')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const previewBox = document.getElementById('avatar-preview-box');
            if (previewBox) previewBox.innerHTML = `<img src="${evt.target.result}" alt="" />`;
          };
          reader.readAsDataURL(file);
        }
      });

      document.getElementById('form-register').addEventListener('submit', handleRegisterSubmit);
      document.getElementById('btn-switch-login').addEventListener('click', () => openModal('login'));
    } else if (state.modal === 'admin_edit_user') {
      const u = state.editingAdminUser;
      if (!u) return;

      modalContainerEl.innerHTML = `
        <div class="modal-backdrop" id="modal-bg">
          <div class="modal-card">
            <button class="button modal-close" id="modal-close-btn">${icons.close}</button>
            <div class="eyebrow">Модерация аккаунта</div>
            <div class="modal-title">Редактировать клиента #${u.id}</div>
            <p>Измените персональные данные или восстановите доступ к аккаунту с новым паролем.</p>
            <form class="auth-form" id="form-admin-edit-user">
              <input type="hidden" name="user_id" value="${u.id}" />

              <div class="field-group">
                <label class="field-label">Отображаемое имя</label>
                <input class="field" name="name" value="${escapeHtml(u.name)}" required />
              </div>

              <div class="field-group">
                <label class="field-label">Логин</label>
                <input class="field" name="login" value="${escapeHtml(u.login)}" required minlength="3" />
              </div>

              <div class="field-group">
                <label class="field-label">Номер телефона</label>
                <input class="field" name="phone" value="${escapeHtml(u.phone)}" placeholder="+7 (700) 000-00-00" />
              </div>

              <div class="two-fields">
                <div class="field-group">
                  <label class="field-label">Роль в системе</label>
                  <select class="field" name="role" ${u.id === state.user.id ? 'disabled' : ''}>
                    <option value="user" ${u.role === 'user' ? 'selected' : ''}>Пользователь</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Администратор</option>
                  </select>
                </div>

                <div class="field-group">
                  <label class="field-label">Статус аккаунта</label>
                  <select class="field" name="is_blocked" ${u.id === state.user.id ? 'disabled' : ''}>
                    <option value="0" ${!u.isBlocked ? 'selected' : ''}>Активен (Восстановлен)</option>
                    <option value="1" ${u.isBlocked ? 'selected' : ''}>Заблокирован</option>
                  </select>
                </div>
              </div>

              <div class="field-group" style="background: #fafaf5; padding: 12px; border-radius: 12px; border: 1px dashed var(--line);">
                <label class="field-label" style="color: var(--accent-dark); font-weight: 800;">Восстановление / Сброс пароля клиента</label>
                <input class="field" type="text" name="new_password" placeholder="Введите новый пароль (не менее 6 знаков)" minlength="6" />
                <span class="field-hint">Оставьте пустым, если пароль клиента менять не требуется.</span>
              </div>

              <div class="form-error" id="admin-user-error" style="display: none;"></div>
              
              <div class="form-actions" style="background: none; padding: 16px 0 0;">
                <button class="button ghost-button" type="button" id="btn-admin-modal-cancel">Отмена</button>
                <button class="button primary-button" type="submit" id="btn-admin-modal-save">Сохранить профиль</button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.getElementById('btn-admin-modal-cancel')?.addEventListener('click', closeModal);
      document.getElementById('form-admin-edit-user')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const errBox = document.getElementById('admin-user-error');
        const saveBtn = document.getElementById('btn-admin-modal-save');
        errBox.style.display = 'none';

        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохраняем...';

        const formData = new FormData(form);
        try {
          const res = await request('admin_update_user', { method: 'POST', body: formData });
          showToast(res.message);
          closeModal();
          renderAdminUsersScreen();
        } catch (err) {
          errBox.textContent = err.message;
          errBox.style.display = 'block';
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Сохранить профиль';
        }
      });
    }

    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-bg')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-bg') closeModal();
    });
  }

  // Handle Login Submit
  async function handleLoginSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.auth-submit');
    const errBox = document.getElementById('auth-error');
    errBox.style.display = 'none';

    btn.disabled = true;
    btn.textContent = 'Входим...';

    const formData = new FormData(form);
    try {
      const res = await request('login', { method: 'POST', body: formData });
      state.user = res.user;
      state.favorites = new Set(res.favorites || []);
      state.unreadMessagesCount = res.unreadCount || 0;
      closeModal();
      renderHeader();
      showToast(`Добро пожаловать, ${state.user.name}!`);
      navigate('account');
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Войти';
    }
  }

  // Handle Register Submit
  async function handleRegisterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.auth-submit');
    const errBox = document.getElementById('auth-error');
    errBox.style.display = 'none';

    btn.disabled = true;
    btn.textContent = 'Создаём...';

    const formData = new FormData(form);
    try {
      const res = await request('register', { method: 'POST', body: formData });
      state.user = res.user;
      state.favorites = new Set(res.favorites || []);
      state.unreadMessagesCount = 0;
      closeModal();
      renderHeader();
      showToast('Аккаунт успешно создан!');
      navigate('account');
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Зарегистрироваться';
    }
  }

  // Handle Logout
  async function logout() {
    stopChatPolling();
    try {
      await request('logout', { method: 'POST' });
    } catch (_) {}
    state.user = null;
    state.favorites.clear();
    state.unreadMessagesCount = 0;
    state.activeChat = null;
    renderHeader();
    navigate('home');
    showToast('Вы вышли из системы');
  }

  // Handle Create OR Edit Listing Form
  function setupAddListingForm() {
    const form = document.getElementById('form-add-listing');
    const previewContent = document.getElementById('ad-preview-content');
    const multiThumbs = document.getElementById('ad-multi-thumbs');
    const fileInput = document.getElementById('ad-file-input');
    const uploadLabel = document.getElementById('ad-upload-label');
    const catSelect = document.getElementById('ad-category');

    // Dynamic subcategory update on category change
    catSelect?.addEventListener('change', (e) => {
      updateAdSubcategories(e.target.value);
    });

    // Handle photo selection (single or multiple)
    fileInput?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      if (files.length === 1) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (previewContent) {
            previewContent.innerHTML = `<img src="${evt.target.result}" alt="Предпросмотр фото" />`;
          }
          if (multiThumbs) multiThumbs.style.display = 'none';
          uploadLabel?.classList.add('has-preview');
        };
        reader.readAsDataURL(files[0]);
      } else {
        // Multiple photos selected
        uploadLabel?.classList.add('has-preview');
        const firstReader = new FileReader();
        firstReader.onload = (evt) => {
          if (previewContent) {
            previewContent.innerHTML = `
              <img src="${evt.target.result}" alt="Главное фото" />
              <span class="carousel-counter-badge" style="top: 10px; left: 10px;">Выбрано фото: ${files.length}</span>
            `;
          }
        };
        firstReader.readAsDataURL(files[0]);

        if (multiThumbs) {
          multiThumbs.style.display = 'flex';
          multiThumbs.innerHTML = '';
          files.forEach((file, idx) => {
            const r = new FileReader();
            r.onload = (evt) => {
              const item = document.createElement('div');
              item.className = 'upload-thumb-item';
              item.innerHTML = `
                <img src="${evt.target.result}" alt="" />
                <span class="upload-thumb-badge">${idx === 0 ? 'Главное' : idx + 1}</span>
              `;
              multiThumbs.appendChild(item);
            };
            r.readAsDataURL(file);
          });
        }
      }
    });

    document.getElementById('btn-add-cancel')?.addEventListener('click', () => {
      resetAddListingForm();
      navigate('home');
    });
    document.getElementById('btn-form-cancel')?.addEventListener('click', () => {
      resetAddListingForm();
      navigate('home');
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-add-submit');
      const errBox = document.getElementById('add-error');
      if (errBox) errBox.style.display = 'none';

      const editId = form.getAttribute('data-edit-id');
      const isEditing = !!editId;

      // Лабораторная работа №4: Индикатор загрузки кнопки (Spinner) и блокировка повторной отправки
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-sm"></span> ${isEditing ? 'Сохранение на сервере...' : 'Публикация на сервере...'}`;

      const formData = new FormData(form);
      if (isEditing) {
        formData.append('id', editId);
      }

      // Передаем DataURL предпросмотра фото для мгновенного отображения
      const previewImg = previewContent?.querySelector('img');
      if (previewImg && previewImg.src && !previewImg.src.includes('data:image/svg')) {
        formData.append('image', previewImg.src);
      }

      try {
        const actionName = isEditing ? 'update_listing' : 'create_listing';
        const res = await request(actionName, { method: 'POST', body: formData });

        if (isEditing) {
          const idx = state.listings.findIndex((item) => item.id === Number(editId));
          if (idx !== -1) {
            state.listings[idx] = res.listing;
          }
          state.selectedListing = res.listing;
          showToast(res.message || 'Объявление успешно обновлено!', 'success');
          resetAddListingForm();
          openDetail(res.listing.id);
        } else {
          state.listings.unshift(res.listing);
          showToast(res.message || 'Объявление успешно опубликовано и добавлено в каталог!', 'success');
          resetAddListingForm();
          openDetail(res.listing.id);
        }
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message;
          errBox.style.display = 'block';
        }
        showToast(err.message || 'Ошибка отправки формы. Проверьте соединение с сервером.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isEditing ? 'Сохранить изменения' : 'Опубликовать объявление';
      }
    });
  }

  // Setup Global Search
  function setupSearch() {
    const input = document.getElementById('search-query');
    const btn = document.getElementById('search-button');

    function applySearch() {
      state.searchQuery = input.value.trim();
      renderCatalog();
    }

    btn?.addEventListener('click', applySearch);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applySearch();
    });
    input?.addEventListener('input', () => {
      if (!input.value.trim() && state.searchQuery) {
        state.searchQuery = '';
        renderCatalog();
      }
    });
  }

  // ============================================================================
  // Лабораторная работа №4: Обработка сетевых состояний, Loader и Error State
  // ============================================================================

  function renderCatalogLoading() {
    const gridEl = document.getElementById('catalog-grid');
    const countEl = document.getElementById('catalog-count');
    if (countEl) countEl.textContent = 'Загрузка предложений с REST API сервера...';
    if (!gridEl) return;

    gridEl.className = 'skeleton-grid';
    gridEl.innerHTML = Array(6).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-line price"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `).join('');
  }

  function renderCatalogError(message) {
    const gridEl = document.getElementById('catalog-grid');
    const countEl = document.getElementById('catalog-count');
    if (countEl) countEl.textContent = 'Ошибка загрузки данных';
    if (!gridEl) return;

    gridEl.className = '';
    gridEl.innerHTML = `
      <div class="error-state">
        <div class="error-state-icon">⚠️</div>
        <div class="error-state-title">Сетевая ошибка при получении данных</div>
        <p class="error-state-desc">${escapeHtml(message || 'Не удалось связаться с REST API сервером. Проверьте соединение с интернетом или запустите локальный сервер python server.py.')}</p>
        <button class="button primary-button btn-retry" id="btn-catalog-retry">Повторить попытку</button>
      </div>
    `;
    document.getElementById('btn-catalog-retry')?.addEventListener('click', () => {
      loadListings();
    });
  }

  async function loadListings(silent = false) {
    if (!silent) {
      renderCatalogLoading();
    }
    try {
      const res = await request('listings');
      state.listings = res.listings || [];
      renderCatalog();
    } catch (err) {
      console.warn('[Lab 4] Ошибка при загрузке каталога:', err);
      renderCatalogError(err.message);
      showToast('Не удалось загрузить данные с сервера. ' + err.message, 'error');
    }
  }

  function setupNetworkListeners() {
    const banner = document.getElementById('network-banner');
    const bannerText = document.getElementById('network-banner-text');
    const bannerIcon = document.getElementById('network-banner-icon');

    function updateStatus(isOnline) {
      if (!banner) return;
      if (isOnline) {
        banner.className = 'network-banner online show';
        if (bannerIcon) bannerIcon.textContent = '✅';
        if (bannerText) bannerText.textContent = 'Подключение к сети восстановлено! Синхронизация данных...';
        setTimeout(() => {
          banner.classList.remove('show');
        }, 3200);
      } else {
        banner.className = 'network-banner offline show';
        if (bannerIcon) bannerIcon.textContent = '⚠️';
        if (bannerText) bannerText.textContent = 'Отсутствует подключение к сети. Приложение перешло в автономный режим.';
      }
    }

    window.addEventListener('online', () => {
      updateStatus(true);
      showToast('Соединение с интернетом восстановлено!', 'success');
      loadListings(true);
    });

    window.addEventListener('offline', () => {
      updateStatus(false);
      showToast('Внимание: потеряно сетевое соединение!', 'warning');
    });

    if (!navigator.onLine) {
      updateStatus(false);
    }
  }

  // App Initialization (Лабораторная работа №4)
  async function init() {
    setupNetworkListeners();

    document.getElementById('logo-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      resetAllFilters();
      navigate('home');
    });

    setupSearch();
    setupFilters();
    setupAddListingForm();

    // Check user session
    try {
      const res = await request('me');
      if (res.user) {
        state.user = res.user;
        state.favorites = new Set(res.favorites || []);
        state.unreadMessagesCount = res.unreadCount || 0;
      }
    } catch (_) {}

    renderHeader();

    // Fetch listings with animated Loader/Spinner
    await loadListings();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
