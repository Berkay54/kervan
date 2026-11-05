# Kervan Lojistik — kurumsal site

Three.js ile gerçek zamanlı 3D konteyner terminali (çalışan RTG vinç, yükleme/indirme döngüsü, tır trafiği), GSAP + ScrollTrigger animasyonları ve Lenis yumuşak kaydırma.

## Çalıştırma

- `baslat.bat` dosyasına çift tıklayın **veya**
- Terminalde: `npm install` → `npm run dev` (tarayıcı otomatik açılır)

Yayın için: `npm run build` → çıktı `dist/` klasöründe (herhangi bir statik sunucuya yüklenebilir).

## Yapı

| Dosya | İçerik |
|---|---|
| `index.html` | Tüm bölümler ve metinler |
| `src/style.css` | Tasarım (renk değişkenleri `:root` içinde) |
| `src/scene.js` | 3D sahne |
| `src/main.js` | Kaydırma, animasyonlar, harita, takip ve form demoları |

## Değiştirilmesi gerekenler

- Firma adı, adresler, telefonlar, ticaret sicil / Mersis numaraları **yer tutucudur**.
- Rakamlar (filo, çalışan, sefer sayıları) örnek veridir.
- Gönderi takibi ve teklif formu demo çalışır; gerçek bir API'ye bağlanmalıdır (`src/main.js` → `tracking()` ve `quoteForm()`).
- Marka rengi: `--signal` (`#ff5a1f`).
