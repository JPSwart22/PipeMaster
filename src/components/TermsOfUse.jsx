export default function TermsOfUse() {
  return (
    <div className="min-h-screen px-6 py-12 mx-auto" style={{ maxWidth: 680, background: '#0f1923', color: '#e2e8f0' }}>
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Use</h1>
      <p className="text-gray-500 text-sm mb-10">Last updated: June 2026</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">1. Acceptance</h2>
        <p className="text-gray-300 leading-relaxed">
          By creating an account or using Pipemaster, you agree to these Terms of Use. If you do not agree, do not use the app.
          These terms apply to all users including farm owners, managers, and crew members.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">2. Permitted Use</h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          Pipemaster is a farm irrigation management tool intended for agricultural operations. You may use it to:
        </p>
        <ul className="text-gray-300 leading-relaxed flex flex-col gap-2 list-disc pl-5">
          <li>Map and manage irrigation systems on your farm or farms you are authorized to manage.</li>
          <li>Track pipe runs, water logs, and field data for your operation.</li>
          <li>Share farm access with your crew members using the farm code feature.</li>
        </ul>
        <p className="text-gray-300 leading-relaxed mt-3">
          You may not use Pipemaster to store data you do not have rights to, or for any unlawful purpose.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">3. Your Data</h2>
        <p className="text-gray-300 leading-relaxed">
          All farm data you create in Pipemaster — fields, runs, water logs, schematics — belongs to you. We do not claim ownership
          of your data. You can export a full backup at any time from Settings → Advanced. Deleting your account
          will permanently remove your farm data from our servers.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">4. Account Responsibility</h2>
        <p className="text-gray-300 leading-relaxed">
          You are responsible for keeping your login credentials secure and for all activity that occurs under your account.
          Your farm code gives anyone full read/write access to your farm data — share it only with people you trust.
          If you believe your account or farm code has been compromised, contact support immediately.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">5. Service Availability</h2>
        <p className="text-gray-300 leading-relaxed">
          Pipemaster is provided as-is. The core mapping and run-tracking features work offline and are stored on your device.
          Cloud sync and AI schematic parsing require an internet connection. We aim for high availability but do not guarantee
          uninterrupted service. Data loss from device failure, deletion, or service disruption is your responsibility to
          safeguard via regular backups.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">6. No Warranty</h2>
        <p className="text-gray-300 leading-relaxed">
          Pipemaster is provided <strong className="text-white">"as is"</strong> without warranty of any kind, express or implied.
          We do not warrant that the app will be error-free, that pipe calculations will be accurate for your specific conditions,
          or that AI schematic readings will always be correct. Always verify critical irrigation data independently.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">7. Limitation of Liability</h2>
        <p className="text-gray-300 leading-relaxed">
          To the maximum extent permitted by law, Pipemaster and its developers shall not be liable for any indirect, incidental,
          or consequential damages arising from use of the app, including but not limited to crop damage, equipment damage,
          or losses resulting from irrigation decisions made using the app.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">8. Changes to These Terms</h2>
        <p className="text-gray-300 leading-relaxed">
          We may update these terms as the app evolves. Continued use of Pipemaster after changes are posted constitutes
          acceptance of the updated terms. We will note the revision date at the top of this page.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-green-400 mb-3">9. Contact</h2>
        <p className="text-gray-300 leading-relaxed">
          Questions about these terms? Email us at{' '}
          <a href="mailto:jppipemaster@gmail.com" className="text-green-400 underline">jppipemaster@gmail.com</a>.
        </p>
      </section>
    </div>
  )
}
