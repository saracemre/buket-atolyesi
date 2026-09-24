# Buket Atölyesi 💐

Çiçek türünü, rengini ve adedini seçip çiçekleri buketin istediğin yerine
yerleştirerek kendi buketini tasarladığın bir web sitesi. İki ayrı mod var:

- **Çizim Buket:** 20 çiçek türü, gerçekçi görünümlü çizimlerle (her renk seçilebilir).
- **Gerçek Buket:** Gerçek çiçek fotoğraflarından oluşan buket (14 tür, farklı renkler).

Her iki modda da buket **2D** ya da **3D** görüntülenebilir. 3D'de buket fareyle/dokunarak
ataletli şekilde döndürülür, yakınlaştırılır; "Döndür" ile kendi etrafında döner, Ön / Yan / Arka / Üst
düğmeleriyle hazır açılara yumuşakça geçilir, çift tıklayınca ortalanır.

## 3D nasıl yapıldı?

Hazır 3D çiçek modelleri (Sketchfab, TurboSquid vb.) hesap/API anahtarı, lisans atfı ya da ücret
gerektiriyor, stilleri birbirini tutmuyor ve renkleri değiştirilemiyordu. Bu yüzden 20 çiçeğin hepsi
**kodla üretilen gerçek 3D geometriden** oluşuyor (`js/flowers3d.js`):

- Her taç yaprak; uzunluk, genişlik profili, çanaklaşma, içe kıvrılma, uçta geriye bükülme,
  kenar kıvrılması, dalgalanma ve saçak parametreleriyle tanımlanan kavisli bir yüzey.
- Gül, şakayık, düğün çiçeği, lisyantus ve lalede yapraklar gerçek çiçeklerdeki gibi iç içe
  halkalara "sarılır" (yaprak kesiti halka yarıçapına oturur, kenarlar üst üste biner).
- Papatya, gerbera, ayçiçeği gibi türlerde ışınsal yapraklar ve dokulu göbekler; lilyumda
  erkek organlar; ortancada yüzlerce minik çiçekçik; yeşillikler de gerçek 3D yapraklar.
- Işıklandırma: stüdyo ortam ışığı (RoomEnvironment + PMREM), yumuşak gölgeler, ortam kapanması
  (GTAO), kadife dokulu fizik tabanlı malzeme, renkleri bozmayan "Neutral" tonlama.
- Yavaş bilgisayarlarda kare hızı düşerse ortam kapanması kendiliğinden kapanır.
- Yeşillik gerçek çiçekçi buketleri örnek alınarak dizilir: kenarda koyu, parlak **salal** yaprağı
  yakası (yapraklar kağıdın içine yaslanır), arkada ve yanlarda birkaç sarkık **gümüş dolar okaliptüs**
  dalı (yuvarlak yapraklar karşılıklı çiftler hâlinde, her çift 90° döner), çiçek aralarında yalnızca
  uçları görünen **ruskus**. Miktar Süsleme sekmesinden Az / Doğal / Bol olarak ayarlanır.
- Çiçek aralarında düz, desenli bir yüzey yerine farklı derinlik, açı ve tonlarda yüzlerce gerçek
  3D yaprak (örneklenmiş/instanced çizim) ve onların arkasında derin gölge var. Cipsofil, ince 3D
  saplar üzerinde yoğun salkımlar hâlinde duruyor.
- Ortam kapanması (GTAO) ince taç yapraklarında siyah benek bırakmasın diye iki yüzlü normal
  geçişiyle hesaplanıyor.

## Gerçek Buket (2D) düzeni

Her fotoğraftan yeşil yaprak/sap ve yan tomurcuklar otomatik ayıklanır; çiçeğin ağırlık merkezi ve
etkin yarıçapı ölçülüp yerleşim buna göre yapılır (çiçekler yalnızca hafifçe birbirine yaslanır).
Fotoğraflardaki ışık yönü tutarlı kalsın diye çiçekler yalnızca ±18° döndürülür; dış sıradakiler
hafif gölgede kalır.

## Çalıştırma

Kurulum gerekmez, internet bağlantısı da gerekmez (3D kütüphanesi ve fotoğraflar projenin içinde).

1. **En kolayı:** `index.html` dosyasına çift tıkla.
2. **Yerel sunucu ile:** `baslat.command` dosyasına çift tıkla (veya terminalde `./baslat.command`),
   ardından http://localhost:8080 adresine git. Alternatif: `python3 sunucu.py 8080`

## Nasıl kullanılır

1. **Buket boyutu:** Kaç çiçeklik bir buket istediğini seç (7 · 12 · 19 · 27 · 37 ya da 3–60 arası özel).
2. **Çiçek ve renk seç.** Seçtiğin çiçek "fırça" gibi çalışır.
3. **Yerleştir:**
   - Buketteki **+** işaretli boş yerlere tıklayınca çiçek tam oraya yerleşir (3D'de de çalışır).
   - Ya da adet seçip **Otomatik yerleştir** de; aynı çiçekler bukete eşit dağıtılır.
4. **Düzenle:** Bir çiçeği sürükleyip başka bir yere bırak (yer değiştirir). Bir çiçeğe tıklayınca
   "Kaldır" ya da "seçili çiçekle değiştir" seçenekleri çıkar. (Klavye: Delete ile kaldır, Esc ile vazgeç.)
5. **Ambalaj & Süsleme:** Dış ve iç kağıt rengi, saten kurdele / jüt ip ve rengi,
   cipsofil (varsayılan minik beyaz çiçekler, rengi seçilebilir) ve yeşillik.
6. **PNG** ile buketi resim olarak indir. Buket tarayıcıda otomatik kaydedilir.

## Çiçek çeşitleri

Çiçekçi sitelerindeki (Pollyanna Flowers, Zekeriyaköy Çiçek vb.) buket çiçeklerinden derlendi:
Gül, Şakayık, Lale, Ortanca, Lilyum, Lisyantus, Papatya, Gerbera, Ayçiçeği, Karanfil, Orkide,
Düğün Çiçeği (Ranunculus), Dalya, Anemon, Frezya, Gala, Anastasia, Çardak Gül, Nergis, Şebboy.

## Gerçek fotoğraflar hakkında

Gerçek moddaki çiçek fotoğrafları **Wikimedia Commons**'tan alındı (Creative Commons / kamu malı
lisanslı; laleler zarif, tek çiçekli fotoğraflardan yeniden seçildi), arka planları yerel bir yapay zekâ modeliyle (rembg) temizlendi ve `js/real-assets.js`
içine gömüldü. Kağıt dokusu **ambientCG** (CC0). Her fotoğrafın sahibi ve lisansı sitede
"Fotoğraf kaynakları ve lisanslar" bağlantısında listelenir.

## Dosya yapısı

```
index.html            Sayfa iskeleti
css/styles.css        Arayüz stilleri
js/util.js            Renk ve rastgele sayı yardımcıları
js/flowers.js         Çiçek çizimleri (gül, lale, şakayık, ayçiçeği, papatya, karanfil, lilyum)
js/flowers-extra.js   Ek çiçek türleri (ortanca, lisyantus, orkide, gerbera ... 13 tür)
js/model.js           Buket yerleri, otomatik dağıtım, taşıma, boyut değiştirme
js/bouquet.js         2D buket çizimi (SVG): kağıt, kurdele, dolgu, yer işaretleri
js/flowers3d.js       Gerçek 3D çiçek modelleri (kodla üretilir)
js/bouquet3d.js       3D buket sahnesi, ışık, kontroller
js/real.js            Gerçek çiçek kataloğu ve fotoğraf sağlayıcı
js/real-assets.js     Gömülü fotoğraflar ve kağıt dokusu (otomatik üretildi)
js/app.js             Arayüz ve durum yönetimi
vendor/three.bundle.js Three.js r186 + OrbitControls, RoomEnvironment, GTAO (MIT: vendor/THREE-LICENSE.txt)
```
