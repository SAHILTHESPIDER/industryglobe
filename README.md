# 🌍 Industry Globe

### Your Career. Your Studios. Your Platform. Your Global Empire.

**Industry Globe** is an entertainment industry life-simulation and business strategy game. Begin as an aspiring actor, build your reputation, produce movies and series, establish production houses, launch streaming platforms, and expand your business into a global entertainment empire.

Build your career, make strategic decisions, compete with industry rivals, and shape your own entertainment legacy.

---

## 🎬 About the Project

Industry Globe brings together celebrity life simulation, entertainment production, business management, and streaming platform strategy in one evolving experience.

Whether your ambition is to become a superstar, own a major production studio, or build a worldwide streaming service, your decisions determine how your empire grows.

## ✨ Features

<table>
  <tr>
    <td width="50%">
      <h3>🎭 Acting & Celebrity Life</h3>
      Build your acting career through auditions, film projects, fame, relationships, premieres, and awards.
    </td>
    <td width="50%">
      <h3>🎥 Production Houses</h3>
      Create production companies, develop projects, manage budgets, and compete with rival studios.
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📺 Streaming Empire</h3>
      Build a streaming brand, grow its content library, manage subscriptions, and compete for viewers.
    </td>
    <td width="50%">
      <h3>🌎 Global Expansion</h3>
      Explore international markets, expand operations, and grow your influence across the entertainment industry.
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>💰 Business & Finance</h3>
      Manage wealth, investments, operating costs, and business opportunities.
    </td>
    <td width="50%">
      <h3>🏆 Fame & Competition</h3>
      Earn recognition, compete with industry rivals, and build a lasting reputation.
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📱 Digital Ecosystem</h3>
      Explore in-game social media, messaging, relationships, financial activities, and career opportunities.
    </td>
    <td width="50%">
      <h3>👨‍👩‍👧 Family & Legacy</h3>
      Build relationships, develop a family, and continue your story across generations where supported.
    </td>
  </tr>
</table>

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 19 | User interface |
| TypeScript | Application logic and type safety |
| Vite | Development server and build tooling |
| Firebase | Backend services and integrations |
| Lucide React | Icons |
| Recharts | Charts and data visualization |
| Capacitor | Native mobile app support |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- npm

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/SAHILTHESPIDER/industryglobe.git
```

**2. Navigate to the project directory**

```bash
cd industryglobe/industry_Globe_main
```

**3. Install dependencies**

```bash
npm install
```

**4. Start the development server**

```bash
npm run dev
```

**5. Open the application**

Visit the local URL shown in your terminal, usually:

```text
http://localhost:3000
```

## 🏗️ Build & Quality Checks

Create a production build:

```bash
npm run build
```

Run the configured lint checks:

```bash
npm run lint
```

## ⚙️ Configuration

Some features may require additional service configuration.

- **Firebase:** Configure the Firebase project settings required by your application.
- **Environment variables:** Use a local `.env.local` file for applicable configuration.
- **Developer tools:** `VITE_DEV_TOOLS_PASSCODE` can configure the developer tools passcode.
- **Gemini integration:** `GEMINI_API_KEY` may be used if Gemini-powered features are configured.

**Security note:** Never commit private API keys, passwords, or credentials to source control.

## 📱 Mobile Support

The project includes Capacitor support for mobile development. Building and running native Android or iOS versions may require additional platform-specific configuration and development tools.

## 🎭 Character creation and skill points

Character creation lives under **Settings → Gameplay → Mods → Character Creation**. A new career uses the same screen. The star gets an automatic fictional X, Instagram, and YouTube profile (handle, avatar, bio, and starting followers). There is no social setup step.

The same screen can add a missing actor. Those people are saved on that career as **Custom** talent and join the existing casting pools, fees, and offers. They are not added to the shipped cast lists.

### Skill-point packs

Premium points are credited only after a Cloud Function confirms the store transaction. The game never adds them on the device first. The balance lives in `players/{uid}/wallet/skillPoints`, which Firestore rules do not let the client write.

| Pack | Product ID | Points | India price | Web fallback |
|---|---|---|---|---|
| Character Creation | `com.sahil.industryglobe.character.creation` | 150, and the character package | **₹1,500** | $17.99 |
| Spark Pack | `com.sahil.industryglobe.skillpoints.5` | 5 | ₹99 | $0.99 |
| Scene Pack | `com.sahil.industryglobe.skillpoints.15` | 15 | ₹299 | $2.99 |
| Reel Pack | `com.sahil.industryglobe.skillpoints.40` | 40 | ₹699 | $6.99 |
| Legacy Pack | `com.sahil.industryglobe.skillpoints.100` | 100 | ₹1,299 | $14.99 |

The smaller packs are priced under the ₹1,500 Character Creation package. On a phone in India the character package displays **₹1,500**. Everywhere else the store's localized price is shown. On web, before a store price exists, the fallback is about **$17.99**. The prices charged are the ones you set in Play Console and App Store Connect. The table is the list to create there.

### What you need to set up

Do not put secret keys in the repo.

1. In **Google Play Console** and **App Store Connect**, create the five product IDs above. Character Creation is a non-consumable. The four packs are consumables. Set the India price of Character Creation to **₹1,500**. Set the other storefronts to the equivalent tier (about $17.99 in the US). Price the smaller packs below that.
2. In **RevenueCat**, add the same products, attach the Play and App Store apps, and copy the public SDK keys plus the secret API key.
3. Put the public keys in `.env.local` (they are safe to ship in the app binary, and they are still not committed):
   - `VITE_REVENUECAT_IOS_KEY`
   - `VITE_REVENUECAT_ANDROID_KEY`
   - `VITE_SKILL_POINT_IAP_DEV=true` only on a machine where you want the dev test button. Leave it unset for a release build.
4. Deploy Cloud Functions from `Industy_Globe_main` after `npm install` inside `functions/`:
   ```bash
   firebase deploy --only functions,firestore:rules
   ```
   Set the function secrets in the Firebase environment, not in git:
   - `REVENUECAT_SECRET_API_KEY` — required before a real purchase can be credited
   - `SKILL_POINT_DEV_GRANTS=true` — only on a test project. Production must leave this unset.
5. The functions are `creditSkillPointPack`, `spendPremiumSkillPoints`, `readSkillPointWallet`, and `restoreSkillPointPurchases` in `us-central1`. Override the region with `VITE_SKILL_POINT_FUNCTION_REGION` if you deploy elsewhere.
6. On web, or on a build with no store, the Store still shows the packs and says purchases are available in the mobile app. The dev button appears only when `VITE_SKILL_POINT_IAP_DEV=true`, and it still waits for the function to accept the grant.

6. On web, or on a build with no store, the Store still shows the packs and says purchases are available in the mobile app. The dev button appears only when `VITE_SKILL_POINT_IAP_DEV=true`, and it still waits for the function to accept the grant.

### Firebase config the owner must replace

The native app id is now `com.sahil.industryglobe`, published as **Industry Globe** by **Sahil**. The files `Industy_Globe_main/android/app/google-services.json` and `Industy_Globe_main/ios/App/App/GoogleService-Info.plist` still carry the previous Firebase mobile app registration. Their `mobilesdk_app_id` / `GOOGLE_APP_ID` and the project id `actor-empire-1ff1d` were not rewritten, because a new config cannot be invented in git.

1. In the Firebase console, open the project you want Industry Globe to use.
2. Add an Android app with package name `com.sahil.industryglobe`. Download the new `google-services.json` and replace `Industy_Globe_main/android/app/google-services.json`.
3. Add an iOS app with bundle id `com.sahil.industryglobe`. Download `GoogleService-Info.plist` and replace `Industy_Globe_main/ios/App/App/GoogleService-Info.plist`.
4. If that Firebase project is new, copy its `projectId`, `authDomain`, and `storageBucket` into `Industy_Globe_main/services/firebaseService.ts`. Until you do, the web client still uses project `actor-empire-1ff1d`.
5. In Play Console and App Store Connect, create the app with the same id. Recreate every in-app product. Skill points use `com.sahil.industryglobe.character.creation` and `com.sahil.industryglobe.skillpoints.5`, `.15`, `.40`, and `.100`. The older cash, energy, and collection products now use the same `com.sahil.industryglobe.` prefix.

Check the crediting rules locally with:

```bash
npm run audit:skill-points
```

## 🗺️ Roadmap & Vision

The long-term vision of Industry Globe is to bring together:

- A deeper celebrity career simulation.
- Production house ownership and entertainment project management.
- Streaming platform creation and business competition.
- International expansion and global entertainment markets.
- Wealth management, relationships, and generational legacy.

*Features listed as future goals should be treated as planned until implemented in the game.*

## 👨‍💻 Author

**Sahil Gupta**

- GitHub: [@SAHILTHESPIDER](https://github.com/SAHILTHESPIDER)

## 📄 License

A license has not yet been specified. Check the repository for licensing information before redistributing or reusing the project.

---

<div align="center">

### 🌍 INDUSTRY GLOBE

**From the spotlight to the boardroom. From one studio to a global empire.**

*Build it. Produce it. Stream it. Own the industry.*

</div>
<a href='https://ko-fi.com/E4W12B1B1I' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi5.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

