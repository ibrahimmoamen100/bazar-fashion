import { BuilderPreset } from "@/types/builder";

export const BUILDER_CATEGORIES = [
  { id: 'all', label: 'جميع الأقسام' },
  { id: 'pc', label: '🖥️ تجميعات كمبيوتر وجيمنج' },
  { id: 'office', label: '💼 جمع مكتبك وست أب' },
  { id: 'apartment', label: '🛋️ جهز شقتك وغرفتك' },
  { id: 'custom', label: '⚙️ بناء حر ومخصص' },
] as const;

export const BUILDER_PRESETS: BuilderPreset[] = [
  {
    id: "am4-budget",
    slug: "am4-budget",
    title: "AM4 Budget",
    category: "pc",
    categoryLabel: "تجميعات PC",
    badge: "6% OFF",
    discountPercentage: 6,
    showcaseImage: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=700&auto=format&fit=crop&q=80",
    description: "تجميعة اقتصادية قوية للألعاب والمونتاج على منصة AMD AM4 مع كرت شاشة ومعالج يقدمان أفضل قيمة مقابل السعر.",
    steps: [
      {
        id: "mobo",
        name: "اللوحة الأم",
        nameEn: "Mother Board",
        required: true,
        defaultOptionId: "msi-b550m",
        options: [
          {
            id: "msi-b550m",
            name: "MSI B550M PRO-VDH WiFi ProSeries Motherboard (AMD AM4, DDR4, PCIe 4.0, SATA 6Gb/s, M.2)",
            brand: "MSI",
            image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80",
            price: 5200,
            priceDelta: 0,
            specs: "Socket AM4, Dual M.2, Wi-Fi AC & Bluetooth",
            quantity: 1,
            inStock: true,
          },
          {
            id: "gigabyte-b450m",
            name: "Gigabyte B450M DS3H V2 (AMD AM4, DDR4, PCIe 3.0, Ultra Durable)",
            brand: "Gigabyte",
            image: "https://images.unsplash.com/photo-1555617778-02518510b9fa?w=400&auto=format&fit=crop&q=80",
            price: 4100,
            priceDelta: -1100,
            specs: "Socket AM4, 4 DIMMs DDR4, M.2 NVMe",
            quantity: 1,
            inStock: true,
          },
          {
            id: "asus-tuf-b550",
            name: "ASUS TUF Gaming B550-PLUS WiFi II (AMD AM4, 8+2 DrMOS, PCIe 4.0)",
            brand: "ASUS",
            image: "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=400&auto=format&fit=crop&q=80",
            price: 7600,
            priceDelta: 2400,
            specs: "TUF Components, WiFi 6, 2.5Gb Ethernet",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "cpu",
        name: "المعالج",
        nameEn: "cpu",
        required: true,
        defaultOptionId: "ryzen-5-5600x",
        options: [
          {
            id: "ryzen-5-5600x",
            name: "AMD Ryzen 5 5600X Tray Processor (6 Cores, 12 Threads, Up to 4.6 GHz)",
            brand: "AMD",
            image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&auto=format&fit=crop&q=80",
            price: 7400,
            priceDelta: 0,
            specs: "6 Cores, 12 Threads, 35MB Cache, 65W",
            quantity: 1,
            inStock: true,
          },
          {
            id: "ryzen-5-5500",
            name: "AMD Ryzen 5 5500 6-Core 3.6 GHz (4.2 GHz Turbo) TRAY",
            brand: "AMD",
            image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&auto=format&fit=crop&q=80",
            price: 4250,
            priceDelta: -3150,
            specs: "6 Cores, 12 Threads, 19MB Cache, 65W",
            quantity: 1,
            inStock: true,
          },
          {
            id: "ryzen-3-4100",
            name: "CPU-AMD-RYZEN 3-4100 4 Core/8 Threads 3.8 GHz (4.0 GHz Turbo) Socket AM4",
            brand: "AMD",
            image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&auto=format&fit=crop&q=80",
            price: 2349,
            priceDelta: -5051,
            specs: "4 Cores, 8 Threads, 65W",
            quantity: 1,
            inStock: true,
          },
          {
            id: "ryzen-7-5700x",
            name: "AMD Ryzen 7 5700X 8-Core 16-Thread 3.4 GHz (4.6 GHz Turbo) Socket AM4",
            brand: "AMD",
            image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&auto=format&fit=crop&q=80",
            price: 9500,
            priceDelta: 2100,
            specs: "8 Cores, 16 Threads, 36MB Cache",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "cooler",
        name: "كولر المعالج",
        nameEn: "Cooling",
        required: false,
        options: [
          {
            id: "deepcool-ak400",
            name: "DeepCool AK400 High-Performance CPU Air Cooler 4 Heatpipes",
            brand: "DeepCool",
            image: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&auto=format&fit=crop&q=80",
            price: 1550,
            priceDelta: 1550,
            specs: "120mm PWM Fan, 220W TDP, Quiet Operation",
            quantity: 1,
            inStock: true,
          },
          {
            id: "cooler-master-ml240l",
            name: "Cooler Master MasterLiquid ML240L V2 RGB AIO Liquid Cooler",
            brand: "Cooler Master",
            image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80",
            price: 3400,
            priceDelta: 3400,
            specs: "240mm Dual Chamber Pump, 2x SickleFlow Fans",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "ram",
        name: "الرامات",
        nameEn: "RAM",
        required: true,
        defaultOptionId: "pny-16gb-3200",
        options: [
          {
            id: "pny-16gb-3200",
            name: "PNY Performance 16GB RAM DDR4 3200MHz CL22 1.2V Memory Module (1x16GB)",
            brand: "PNY",
            image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&auto=format&fit=crop&q=80",
            price: 1900,
            priceDelta: 0,
            specs: "16GB DDR4, 3200MHz, Low Voltage",
            quantity: 1,
            inStock: true,
          },
          {
            id: "corsair-32gb-3600",
            name: "Corsair Vengeance LPX 32GB (2x16GB) DDR4 3600MHz CL18",
            brand: "Corsair",
            image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&auto=format&fit=crop&q=80",
            price: 4200,
            priceDelta: 2300,
            specs: "32GB Dual Channel (2x16GB), 3600MHz, Black Heatspreader",
            quantity: 1,
            inStock: true,
          },
          {
            id: "teamgroup-16gb-rgb",
            name: "TeamGroup T-Force Delta RGB 16GB (2x8GB) DDR4 3200MHz White",
            brand: "TeamGroup",
            image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&auto=format&fit=crop&q=80",
            price: 2450,
            priceDelta: 550,
            specs: "16GB Dual Channel, Full 120° RGB Ultra-Wide Glow",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "vga",
        name: "كرت الشاشة",
        nameEn: "VGA",
        required: true,
        defaultOptionId: "asus-rtx-3050",
        options: [
          {
            id: "asus-rtx-3050",
            name: "ASUS Dual GeForce RTX 3050 OC Edition 6GB GDDR6",
            brand: "ASUS",
            image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&auto=format&fit=crop&q=80",
            price: 12500,
            priceDelta: 0,
            specs: "6GB GDDR6, Ray Tracing, DLSS, Dual Axial Fans",
            quantity: 1,
            inStock: true,
          },
          {
            id: "sapphire-rx-6600",
            name: "Sapphire Pulse AMD Radeon RX 6600 8GB GDDR6",
            brand: "Sapphire",
            image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80",
            price: 13900,
            priceDelta: 1400,
            specs: "8GB GDDR6, 1080p Ultra Gaming, Dual-X Cooling",
            quantity: 1,
            inStock: true,
          },
          {
            id: "msi-rtx-4060",
            name: "MSI GeForce RTX 4060 Ventus 2X Black 8GB OC GDDR6 DLSS 3",
            brand: "MSI",
            image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&auto=format&fit=crop&q=80",
            price: 18800,
            priceDelta: 6300,
            specs: "8GB GDDR6, DLSS 3 Frame Gen, Ray Tracing 3rd Gen",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "ssd",
        name: "وحدة التخزين",
        nameEn: "SSD",
        required: true,
        defaultOptionId: "hiksemi-128g",
        options: [
          {
            id: "hiksemi-128g",
            name: "HIKSEMI WAVE SATA 128G High Speed Solid State Drive",
            brand: "Hiksemi",
            image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&auto=format&fit=crop&q=80",
            price: 550,
            priceDelta: 0,
            specs: "SATA 6Gb/s, Read up to 530MB/s",
            quantity: 1,
            inStock: true,
          },
          {
            id: "kingston-nv2-500g",
            name: "Kingston NV2 500GB M.2 2280 NVMe PCIe 4.0 Internal SSD",
            brand: "Kingston",
            image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&auto=format&fit=crop&q=80",
            price: 1850,
            priceDelta: 1300,
            specs: "PCIe 4.0 NVMe, Up to 3500MB/s Read",
            quantity: 1,
            inStock: true,
          },
          {
            id: "crucial-p3-1tb",
            name: "Crucial P3 Plus 1TB PCIe M.2 2280 NVMe SSD",
            brand: "Crucial",
            image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&auto=format&fit=crop&q=80",
            price: 3300,
            priceDelta: 2750,
            specs: "1TB NVMe, Gen4 Speed up to 5000MB/s",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "case-psu",
        name: "الكيس ومزود الطاقة",
        nameEn: "CASE & PSU",
        required: true,
        defaultOptionId: "gamdias-aura-gc2",
        options: [
          {
            id: "gamdias-aura-gc2",
            name: "GAMDIAS AURA GC2 ELITE Mid-Tower Case (4 Built-in 120mm Fixed RGB Fans) + AURA GP750 750W Power Supply",
            brand: "Gamdias",
            image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80",
            price: 4900,
            priceDelta: 0,
            specs: "Tempered Glass, Mesh Front, 750W PSU Included, 4x RGB Fans",
            quantity: 1,
            inStock: true,
          },
          {
            id: "antec-nx292-psu",
            name: "Antec NX292 White Mid-Tower Case (3x RGB Fans) + Antec Atom B650 650W Bronze",
            brand: "Antec",
            image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80",
            price: 4400,
            priceDelta: -500,
            specs: "Mesh airflow, 650W 80+ Bronze certified PSU",
            quantity: 1,
            inStock: true,
          },
          {
            id: "nzxt-h5-flow",
            name: "NZXT H5 Flow Compact RGB Case + Corsair RM750e 750W Gold Modular PSU",
            brand: "NZXT",
            image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80",
            price: 9200,
            priceDelta: 4300,
            specs: "Premium Glass, Dedicated Bottom Fan, 80+ Gold Modular PSU",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "monitor",
        name: "الشاشة",
        nameEn: "MONITOR",
        required: false,
        options: [
          {
            id: "samsung-odyssey-g3",
            name: "Samsung Odyssey G3 24\" FHD 165Hz 1ms FreeSync Gaming Monitor",
            brand: "Samsung",
            image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&auto=format&fit=crop&q=80",
            price: 5900,
            priceDelta: 5900,
            specs: "24-inch, 1920x1080, 165Hz, Height Adjustable Stand",
            quantity: 1,
            inStock: true,
          },
          {
            id: "asus-tuf-vg279",
            name: "ASUS TUF Gaming VG279Q1A 27\" IPS FHD 165Hz 1ms Gaming Monitor",
            brand: "ASUS",
            image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&auto=format&fit=crop&q=80",
            price: 8400,
            priceDelta: 8400,
            specs: "27-inch IPS panel, 165Hz, ELMB, FreeSync Premium",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "accessories",
        name: "الملحقات والإكسسوارات",
        nameEn: "Accessories",
        required: false,
        options: [
          {
            id: "redragon-combo",
            name: "Redragon S101 RGB Gaming Keyboard & Mouse Combo with Wrist Rest",
            brand: "Redragon",
            image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&auto=format&fit=crop&q=80",
            price: 1100,
            priceDelta: 1100,
            specs: "RGB Backlit, 3200 DPI Mouse, Ergonomic",
            quantity: 1,
            inStock: true,
          },
          {
            id: "hyperx-cloud-stinger",
            name: "HyperX Cloud Stinger 2 Lightweight Gaming Headset with Mic",
            brand: "HyperX",
            image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80",
            price: 1950,
            priceDelta: 1950,
            specs: "50mm Directional Drivers, DTS Headphone:X Spatial Audio",
            quantity: 1,
            inStock: true,
          }
        ]
      }
    ]
  },
  {
    id: "rtx-4070-beast",
    slug: "rtx-4070-super",
    title: "RTX 4070 Super Beast",
    category: "pc",
    categoryLabel: "تجميعات PC",
    badge: "تجميعة الوحش ⚡",
    discountPercentage: 8,
    views: 41820,
    productsCount: 88,
    showcaseImage: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=700&auto=format&fit=crop&q=80",
    description: "تجميعة الجيمنج الاحترافية والبث المباشر وصناعة المحتوى بأعلى إعدادات 2K و 4K مع أحدث أجيال المعالجة وكروت الشاشة.",
    steps: [
      {
        id: "mobo",
        name: "اللوحة الأم",
        nameEn: "Mother Board",
        required: true,
        defaultOptionId: "msi-z790-pro",
        options: [
          {
            id: "msi-z790-pro",
            name: "MSI PRO Z790-P WiFi DDR5 (LGA 1700, PCIe 5.0, Wi-Fi 6E, USB 3.2 Gen 2x2)",
            brand: "MSI",
            image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80",
            price: 11500,
            priceDelta: 0,
            specs: "LGA 1700, DDR5 Up to 7200+ MHz, 4x M.2 Slots",
            quantity: 1,
            inStock: true,
          },
          {
            id: "asus-rog-strix-b760",
            name: "ASUS ROG Strix B760-F Gaming WiFi DDR5",
            brand: "ASUS ROG",
            image: "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=400&auto=format&fit=crop&q=80",
            price: 13900,
            priceDelta: 2400,
            specs: "AURA Sync RGB, SupremeFX Audio, 16+1 Power Stages",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "cpu",
        name: "المعالج",
        nameEn: "cpu",
        required: true,
        defaultOptionId: "intel-i7-14700k",
        options: [
          {
            id: "intel-i7-14700k",
            name: "Intel Core i7-14700KF 20-Core (8P+12E) Up to 5.6 GHz LGA 1700",
            brand: "Intel",
            image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&auto=format&fit=crop&q=80",
            price: 18500,
            priceDelta: 0,
            specs: "20 Cores / 28 Threads, 33MB Smart Cache",
            quantity: 1,
            inStock: true,
          },
          {
            id: "intel-i9-14900k",
            name: "Intel Core i9-14900K 24-Core (8P+16E) Up to 6.0 GHz",
            brand: "Intel",
            image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&auto=format&fit=crop&q=80",
            price: 26500,
            priceDelta: 8000,
            specs: "24 Cores / 32 Threads, 36MB Cache, Max 6.0 GHz",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "cooler",
        name: "كولر المعالج المائي",
        nameEn: "Cooling",
        required: true,
        defaultOptionId: "nzxt-kraken-360",
        options: [
          {
            id: "nzxt-kraken-360",
            name: "NZXT Kraken Elite 360 RGB AIO Liquid Cooler with LCD Display",
            brand: "NZXT",
            image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80",
            price: 11900,
            priceDelta: 0,
            specs: "360mm Radiator, 2.36\" Wide-Angle LCD, RGB Fans",
            quantity: 1,
            inStock: true,
          },
          {
            id: "deepcool-ls720",
            name: "DeepCool LS720 High-Performance 360mm AIO Liquid Cooler",
            brand: "DeepCool",
            image: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&auto=format&fit=crop&q=80",
            price: 6800,
            priceDelta: -5100,
            specs: "4th Gen Dual-Chamber Pump, Low Noise FC120 Fans",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "ram",
        name: "الرامات DDR5",
        nameEn: "RAM",
        required: true,
        defaultOptionId: "corsair-ddr5-32gb",
        options: [
          {
            id: "corsair-ddr5-32gb",
            name: "Corsair Dominator Titanium RGB DDR5 32GB (2x16GB) 6000MHz CL30",
            brand: "Corsair",
            image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&auto=format&fit=crop&q=80",
            price: 7900,
            priceDelta: 0,
            specs: "32GB (2x16GB), 6000MHz, XMP 3.0, DHX Cooling",
            quantity: 1,
            inStock: true,
          },
          {
            id: "corsair-ddr5-64gb",
            name: "Corsair Vengeance RGB DDR5 64GB (2x32GB) 6000MHz CL30",
            brand: "Corsair",
            image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&auto=format&fit=crop&q=80",
            price: 13500,
            priceDelta: 5600,
            specs: "64GB Extreme Kit, Optimized for Intel and AMD",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "vga",
        name: "كرت الشاشة",
        nameEn: "VGA",
        required: true,
        defaultOptionId: "gigabyte-rtx-4070-super",
        options: [
          {
            id: "gigabyte-rtx-4070-super",
            name: "Gigabyte GeForce RTX 4070 SUPER GAMING OC 12GB GDDR6X",
            brand: "Gigabyte",
            image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&auto=format&fit=crop&q=80",
            price: 36500,
            priceDelta: 0,
            specs: "12GB GDDR6X, WINDFORCE 3X Fans, Dual BIOS, RGB Fusion",
            quantity: 1,
            inStock: true,
          },
          {
            id: "msi-rtx-4080-super",
            name: "MSI GeForce RTX 4080 SUPER 16G GAMING X SLIM 16GB GDDR6X",
            brand: "MSI",
            image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&auto=format&fit=crop&q=80",
            price: 54000,
            priceDelta: 17500,
            specs: "16GB GDDR6X, TRI FROZR 3 Thermal Design, TORX Fan 5.0",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "ssd",
        name: "وحدة التخزين فائقة السرعة",
        nameEn: "SSD",
        required: true,
        defaultOptionId: "samsung-990-pro-2tb",
        options: [
          {
            id: "samsung-990-pro-2tb",
            name: "Samsung 990 PRO 2TB PCIe 4.0 M.2 2280 NVMe SSD (7450MB/s)",
            brand: "Samsung",
            image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&auto=format&fit=crop&q=80",
            price: 8800,
            priceDelta: 0,
            specs: "Read 7450MB/s, Write 6900MB/s, Heatsink Ready",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "case-psu",
        name: "الكيس ومزود الطاقة الذهبي",
        nameEn: "CASE & PSU",
        required: true,
        defaultOptionId: "lianli-o11-psu850",
        options: [
          {
            id: "lianli-o11-psu850",
            name: "Lian Li O11 Vision Dual-Chamber Glass Case + Corsair RM850x 850W Gold Fully Modular",
            brand: "Lian Li",
            image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80",
            price: 15900,
            priceDelta: 0,
            specs: "Panoramic Glass, 850W 80+ Gold, 100% Japanese Capacitors",
            quantity: 1,
            inStock: true,
          }
        ]
      }
    ]
  },
  {
    id: "home-office-setup",
    slug: "office-pro-setup",
    title: "جمع مكتبك وست أب الإنتاجية (Home Office)",
    category: "office",
    categoryLabel: "جمع مكتبك",
    badge: "وفر 10% 💼",
    discountPercentage: 10,
    views: 18450,
    productsCount: 65,
    showcaseImage: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=700&auto=format&fit=crop&q=80",
    description: "باقة متكاملة لتجهيز مساحة عمل مريحة وأنيقة تزيد من إنتاجيتك في المنزل أو العمل، مع مكتب كهربائي وكرسي طبي وحلول تنظيم الكابلات.",
    steps: [
      {
        id: "desk",
        name: "مكتب العمل (Desk)",
        nameEn: "Standing Desk",
        required: true,
        defaultOptionId: "standing-desk-smart",
        options: [
          {
            id: "standing-desk-smart",
            name: "مكتب هيدروليك كهربائي ذكي قابل لتعديل الارتفاع بذاكرة رقمية (140x70 سم) خشب ماهوجني",
            brand: "ErgoDesk",
            image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&auto=format&fit=crop&q=80",
            price: 9500,
            priceDelta: 0,
            specs: "Dual Motor, 4 Memory Presets, Anti-collision Sensor, Load 120kg",
            quantity: 1,
            inStock: true,
          },
          {
            id: "wood-classic-desk",
            name: "مكتب عمل كلاسيكي خشب صلب مع وحدات أدراج ومنافذ شحن مدمجة (120x60 سم)",
            brand: "WoodCraft",
            image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&auto=format&fit=crop&q=80",
            price: 5200,
            priceDelta: -4300,
            specs: "خشب طبيعي معالج، منافذ كابلات وتنظيم أدراج",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "chair",
        name: "كرسي المكتب الطبي (Ergonomic Chair)",
        nameEn: "Chair",
        required: true,
        defaultOptionId: "sihoo-ergonomic",
        options: [
          {
            id: "sihoo-ergonomic",
            name: "كرسي طبي مريح Sihoo Doro C300 شبكي بالكامل مع دعم قطني ديناميكي ثلاثي الأبعاد",
            brand: "Sihoo",
            image: "https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=400&auto=format&fit=crop&q=80",
            price: 8400,
            priceDelta: 0,
            specs: "Full Breathable Mesh, 3D Armrests, Dynamic Lumbar Support",
            quantity: 1,
            inStock: true,
          },
          {
            id: "leather-executive-chair",
            name: "كرسي مدراء جلد طبيعي مبطن بالإسفنج عالي الكثافة مع مسند أقدام مخفي",
            brand: "RoyalSeating",
            image: "https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=400&auto=format&fit=crop&q=80",
            price: 6100,
            priceDelta: -2300,
            specs: "جلد فاخر، مسند قدم قابل للسحب، إمالة حتى 155 درجة",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "monitor-arm",
        name: "ذراع وحامل الشاشة (Monitor Arm)",
        nameEn: "Monitor Arm",
        required: false,
        options: [
          {
            id: "north-bayou-f80",
            name: "ذراع شاشة هيدروليكي مفرد North Bayou NB-F80 يدعم حتى 32 بوصة وتدوير 360°",
            brand: "North Bayou",
            image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&auto=format&fit=crop&q=80",
            price: 1350,
            priceDelta: 1350,
            specs: "Gas Spring, Cable Management, VESA 75/100",
            quantity: 1,
            inStock: true,
          },
          {
            id: "north-bayou-f160-dual",
            name: "ذراع شاشات مزدوج North Bayou F160 يدعم شاشتين حتى 32 بوصة",
            brand: "North Bayou",
            image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&auto=format&fit=crop&q=80",
            price: 2400,
            priceDelta: 2400,
            specs: "Dual Monitor, Gas Spring, Heavy Duty Aluminum",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "lighting",
        name: "الإضاءة وحماية العين (Desk Light)",
        nameEn: "Lighting",
        required: false,
        options: [
          {
            id: "screenbar-light",
            name: "شريط إضاءة الشاشة Baseus i-Wok 3 مع تحكم لمسي وحماية من الأشعة الزرقاء",
            brand: "Baseus",
            image: "https://images.unsplash.com/photo-1517055729445-fa7d27394b48?w=400&auto=format&fit=crop&q=80",
            price: 1200,
            priceDelta: 1200,
            specs: "Asymmetric Light, Zero Screen Glare, 3 Color Temps",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "docking",
        name: "وحدة التوصيل والدسبلاي (Docking Station)",
        nameEn: "Docking Station",
        required: false,
        options: [
          {
            id: "dell-wd19s-dock",
            name: "Dell WD19S 180W USB-C Docking Station (DisplayPort, HDMI, 3x USB, Ethernet)",
            brand: "Dell",
            image: "https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=400&auto=format&fit=crop&q=80",
            price: 4800,
            priceDelta: 4800,
            specs: "130W Power Delivery to Laptop, Dual 4K Displays",
            quantity: 1,
            inStock: true,
          }
        ]
      }
    ]
  },
  {
    id: "smart-apartment-setup",
    slug: "smart-apartment-deluxe",
    title: "تجهيز غرفة المعيشة والشقة الذكية (Smart Home)",
    category: "apartment",
    categoryLabel: "جهز شقتك",
    badge: "باقة كاملة ✨",
    discountPercentage: 12,
    views: 9820,
    productsCount: 42,
    showcaseImage: "https://images.unsplash.com/photo-1540518614846-7ede433c4550?w=700&auto=format&fit=crop&q=80",
    description: "باقة متناسقة للشقق وغرف المعيشة العصرية: شاشة سمارت بدقة 4K، ساوند بار محيطي، إضاءة ذكية ومكنسة روبوت ذكية لراحتك الكاملة.",
    steps: [
      {
        id: "tv",
        name: "الشاشة الذكية (Smart TV)",
        nameEn: "Display",
        required: true,
        defaultOptionId: "lg-oled-55",
        options: [
          {
            id: "lg-oled-55",
            name: "شاشة LG OLED C3 55 بوصة 4K 120Hz مع Dolby Vision و WebOS",
            brand: "LG",
            image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&auto=format&fit=crop&q=80",
            price: 43000,
            priceDelta: 0,
            specs: "OLED Evo, α9 AI Processor 4K, 4x HDMI 2.1, G-Sync",
            quantity: 1,
            inStock: true,
          },
          {
            id: "samsung-qled-55",
            name: "شاشة Samsung QLED 4K Q60C 55 بوصة مع تقنية Quantum HDR",
            brand: "Samsung",
            image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&auto=format&fit=crop&q=80",
            price: 24500,
            priceDelta: -18500,
            specs: "100% Color Volume with Quantum Dot, AirSlim Design",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "soundbar",
        name: "النظام الصوتي والساوند بار (Soundbar)",
        nameEn: "Audio",
        required: false,
        options: [
          {
            id: "jbl-bar-500",
            name: "ساوند بار JBL Bar 500 Pro 5.1 قناة 590W مع مضخم صوت لاسلكي و Dolby Atmos",
            brand: "JBL",
            image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400&auto=format&fit=crop&q=80",
            price: 18500,
            priceDelta: 18500,
            specs: "590W Total Power, 10\" Down-firing Subwoofer, Wi-Fi AirPlay",
            quantity: 1,
            inStock: true,
          }
        ]
      },
      {
        id: "robot-vacuum",
        name: "مكنسة الروبوت الذكية (Smart Cleaning)",
        nameEn: "Robot Vacuum",
        required: false,
        options: [
          {
            id: "roborock-q7-max",
            name: "مكنسة روبوت وممسحة ذكية Roborock Q7 Max مع خريطة ليزر LiDAR وقوة شفط 4200Pa",
            brand: "Roborock",
            image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80",
            price: 16800,
            priceDelta: 16800,
            specs: "LiDAR Navigation, 3D Mapping, App Control & Alexa",
            quantity: 1,
            inStock: true,
          }
        ]
      }
    ]
  }
];
