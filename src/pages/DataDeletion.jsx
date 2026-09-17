import React, { useEffect } from "react";

export default function DataDeletion() {
  useEffect(() => {
    const previous = document.title;
    document.title = "IMALI Data Deletion Instructions";
    return () => { document.title = previous; };
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <article className="mx-auto max-w-4xl px-6 py-14 space-y-6">
        <h1 className="text-3xl font-bold">IMALI Data Deletion Instructions</h1>
        <p className="text-white/80">You can request deletion of personal information associated with your IMALI account and connected Meta services, including Facebook and Instagram.</p>
        <h2 className="text-xl font-semibold">How to request deletion</h2>
        <ol className="list-decimal pl-6 text-white/80 space-y-4">
          <li>Email <a className="text-emerald-400 underline" href="mailto:imalidefi@gmail.com?subject=Data%20Deletion%20Request">imalidefi@gmail.com</a>.</li>
          <li>Use the subject <strong>Data Deletion Request</strong>.</li>
          <li>Include the email address associated with your IMALI account and, when applicable, the Facebook or Instagram account associated with your request.</li>
          <li>IMALI will verify your request and delete applicable personal information and Meta-related account data, except information that must be retained for legitimate legal, security, fraud-prevention, accounting, or regulatory requirements.</li>
        </ol>
        <h2 className="text-xl font-semibold">Disconnecting Meta services</h2>
        <p className="text-white/80">You can disconnect applicable Meta services from IMALI. You can also remove IMALI’s access through the applicable Facebook or Instagram account settings. Disconnecting a service does not replace a request to delete previously stored information.</p>
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-white/80">For data-deletion requests or questions, contact <a className="text-emerald-400 underline" href="mailto:imalidefi@gmail.com">imalidefi@gmail.com</a>.</p>
      </article>
    </div>
  );
}
