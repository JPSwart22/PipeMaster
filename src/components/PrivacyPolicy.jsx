export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen px-6 py-12 mx-auto" style={{ maxWidth: 680, background: '#0f1923', color: '#e2e8f0' }}>
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-10">Last updated: June 2026</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">1. Overview</h2>
        <p className="text-gray-300 leading-relaxed">
          Pipemaster is a farm irrigation management app built for polypipe farmers in the Mississippi Delta.
          This policy explains what data we collect, how we use it, and how we protect it.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">2. Data We Collect</h2>
        <ul className="text-gray-300 leading-relaxed flex flex-col gap-2">
          <li><span className="text-white font-medium">Account information</span> — your email address and display name, used to identify your account.</li>
          <li><span className="text-white font-medium">Farm data</span> — fields, wells, risers, pipe runs, segments, and water logs that you create in the app. This data belongs to you.</li>
          <li><span className="text-white font-medium">Location</span> — your GPS position is used on-screen to show your location on the farm map. It is never stored or transmitted to our servers.</li>
          <li><span className="text-white font-medium">Device storage</span> — farm data is stored locally on your device using IndexedDB so the app works offline.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">3. How We Use Your Data</h2>
        <ul className="text-gray-300 leading-relaxed flex flex-col gap-2">
          <li>To sync your farm data across multiple devices using your farm code.</li>
          <li>To authenticate your account securely.</li>
          <li>To provide AI-assisted pipe schematic parsing when you import a photo — the image is sent to Anthropic's API and is not stored by us.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">4. Third-Party Services</h2>
        <ul className="text-gray-300 leading-relaxed flex flex-col gap-2">
          <li><span className="text-white font-medium">Supabase</span> — used for authentication and cloud sync of farm data. <a href="https://supabase.com/privacy" className="text-green-400 underline">Supabase Privacy Policy</a></li>
          <li><span className="text-white font-medium">Anthropic Claude</span> — used to parse pipe schematic photos. Images are processed and not retained. <a href="https://www.anthropic.com/privacy" className="text-green-400 underline">Anthropic Privacy Policy</a></li>
          <li><span className="text-white font-medium">Vercel</span> — hosts the web app and API. <a href="https://vercel.com/legal/privacy-policy" className="text-green-400 underline">Vercel Privacy Policy</a></li>
          <li><span className="text-white font-medium">Esri / ArcGIS</span> — provides satellite map tiles. No personal data is shared with Esri.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">5. Data Sharing</h2>
        <p className="text-gray-300 leading-relaxed">
          We do not sell, trade, or share your personal data with third parties for marketing purposes.
          Farm data shared via a farm code is only accessible to users who have that code.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">6. Data Retention & Deletion</h2>
        <p className="text-gray-300 leading-relaxed">
          Your farm data is stored locally on your device and in Supabase under your account.
          You can delete your data at any time by contacting us. Signing out removes your session
          from the device. To request full account and data deletion, email us at the address below.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">7. Children's Privacy</h2>
        <p className="text-gray-300 leading-relaxed">
          Pipemaster is not directed at children under 13. We do not knowingly collect data from children.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">8. Security</h2>
        <p className="text-gray-300 leading-relaxed">
          All data is transmitted over HTTPS. Authentication is handled by Supabase with industry-standard
          security practices. Farm data in the cloud is protected by your account credentials.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">9. Changes to This Policy</h2>
        <p className="text-gray-300 leading-relaxed">
          We may update this policy from time to time. The date at the top of this page reflects
          the most recent revision.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">10. Contact</h2>
        <p className="text-gray-300 leading-relaxed">
          For privacy questions or data deletion requests, contact us at:<br />
          <a href="mailto:2205jpswart@gmail.com" className="text-green-400 underline">2205jpswart@gmail.com</a>
        </p>
      </section>
    </div>
  )
}
