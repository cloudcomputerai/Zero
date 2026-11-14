import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Link2 } from 'lucide-react';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import Footer from '@/components/home/footer';
import { createSectionId } from '@/lib/utils';

const LAST_UPDATED = 'November 14, 2026';

export default function PrivacyPolicy() {
  const { copiedValue: copiedSection, copyToClipboard } = useCopyToClipboard();

  const handleCopyLink = (sectionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    copyToClipboard(url, sectionId);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-auto bg-white dark:bg-[#111111]">
      <Navigation />
      <div className="relative z-10 flex grow flex-col">
        <div className="absolute top-6 right-4 md:top-8 md:right-auto md:left-8">
          <a href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </a>
        </div>

        <div className="container mx-auto max-w-4xl px-4 py-16">
          <Card className="overflow-hidden rounded-xl border-none bg-gray-50/80 dark:bg-transparent">
            <CardHeader className="space-y-4 px-8 py-8">
              <div className="space-y-2 text-center">
                <CardTitle className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white">
                  Privacy Policy
                </CardTitle>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-sm text-gray-500 dark:text-white/60">
                    Last updated: {LAST_UPDATED}
                  </p>
                </div>
              </div>
            </CardHeader>

            <div className="space-y-8 p-8">
              {sections.map((section) => {
                const sectionId = createSectionId(section.title);
                return (
                  <div key={section.title} id={sectionId} className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                        {section.title}
                      </h2>
                      <button
                        onClick={() => handleCopyLink(sectionId)}
                        className="text-gray-400 transition-all hover:text-gray-700 dark:text-white/60 dark:hover:text-white/80"
                        aria-label={`Copy link to ${section.title} section`}
                      >
                        <Link2
                          className={`h-4 w-4 ${copiedSection === sectionId ? 'text-green-500 dark:text-green-400' : ''}`}
                        />
                      </button>
                    </div>
                    <div className="prose prose-sm prose-a:text-blue-600 hover:prose-a:text-blue-800 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300 max-w-none text-gray-600 dark:text-white/80">
                      {section.content}
                    </div>
                  </div>
                );
              })}

              <div className="mt-12 flex flex-wrap items-center justify-center gap-4"></div>
            </div>
          </Card>
        </div>

        <Footer />
      </div>
    </div>
  );
}

const CONTACT = 'support@egorai.com';

const sections = [
  {
    title: 'Who We Are',
    content: (
      <div className="space-y-4">
        <p>
          EgorMail is an AI-powered email client operated by CloudComputerAI (&quot;we&quot;,
          &quot;us&quot;). This policy explains what information EgorMail collects, how we use it,
          who we share it with, and the choices you have. It applies to the EgorMail app at
          email.egorai.com and the EgorMail website at egorai.com/egormail.
        </p>
        <p>
          EgorMail is built on the open-source Zero project. This policy covers our service only;
          Zero Email Inc. does not operate EgorMail and does not receive your data from us.
        </p>
      </div>
    ),
  },
  {
    title: 'Information We Collect',
    content: (
      <div className="space-y-4">
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong>Account information:</strong> your name, email address and profile picture from
            the Google account you sign in with.
          </li>
          <li>
            <strong>Mailbox access credentials:</strong> the OAuth tokens Google issues when you
            connect a mailbox, or, for IMAP/SMTP mailboxes, the server settings and password you
            enter (stored encrypted).
          </li>
          <li>
            <strong>Email data:</strong> messages, attachments, labels, drafts and related metadata
            (senders, recipients, dates) from the mailboxes you connect.
          </li>
          <li>
            <strong>Data we derive to run features:</strong> cached copies of messages, thread
            summaries, labels, search indexes (embeddings), drafts suggested by the assistant, and
            your conversations with the Egor assistant.
          </li>
          <li>
            <strong>Settings:</strong> your preferences, AI settings, writing-style preferences and
            keyboard shortcuts.
          </li>
          <li>
            <strong>Technical data:</strong> basic logs (such as IP address, browser type, request
            times and errors) that our hosting infrastructure records to keep the service secure and
            working.
          </li>
        </ul>
        <p>
          We do not currently use advertising, analytics or third-party error-tracking tools in the
          app. If that changes, we will update this policy first.
        </p>
      </div>
    ),
  },
  {
    title: 'How We Use Your Information',
    content: (
      <div className="space-y-4">
        <p>We use your information only to provide and improve EgorMail for you, including to:</p>
        <ul className="ml-4 list-disc space-y-2">
          <li>show, search, sort, label, send and archive your email;</li>
          <li>summarize threads, suggest replies and drafts, and answer your questions about your mail;</li>
          <li>keep your account secure, prevent abuse and fix problems;</li>
          <li>contact you about your account or important changes to the service.</li>
        </ul>
        <p>
          We do not sell your data, we do not use your email for advertising, and we do not use
          your email or Google user data to train generalized AI models.
        </p>
      </div>
    ),
  },
  {
    title: 'Google User Data and Limited Use',
    content: (
      <div className="space-y-4">
        <p>
          When you connect a Google account, EgorMail requests access to Gmail so it can read,
          organize, draft and send email on your behalf, plus your basic profile (name, email
          address and picture) to sign you in. We only request access after you grant consent on
          Google&apos;s screen, and you can revoke it at any time in your{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            Google Account permissions
          </a>
          .
        </p>
        <p>
          EgorMail&apos;s use and transfer of information received from Google APIs to any other
          app will adhere to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. In particular:
        </p>
        <ul className="ml-4 list-disc space-y-2">
          <li>we use Google user data only to provide and improve user-facing features of EgorMail;</li>
          <li>
            we transfer it to others only as needed to provide those features (for example, to the
            AI providers listed below when you use an AI feature), to comply with law, or as part
            of a merger or acquisition with your notice;
          </li>
          <li>we do not use it for advertising, and we do not sell it;</li>
          <li>
            people do not read it unless you give us permission for a specific message, it is
            necessary for security or to comply with law, or it has been aggregated and anonymized.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: 'AI Features',
    content: (
      <div className="space-y-4">
        <p>
          When you use an AI feature (such as summaries, suggested drafts, auto-labels, search or
          the Egor assistant), the parts of your email needed for that feature are sent to an AI
          model provider to produce the result. Depending on the feature, this may be Cloudflare
          Workers AI or a model provider reached through OpenRouter. These providers process the
          content only to return a result to us.
        </p>
        <p>
          You can turn individual AI features, or all of them, off in Settings. When AI is off,
          EgorMail does not send your mail to any AI model.
        </p>
      </div>
    ),
  },
  {
    title: 'Where Your Data Is Stored and Who Processes It',
    content: (
      <div className="space-y-4">
        <p>
          Each EgorMail account runs on its own isolated instance. We use these service providers
          to operate it:
        </p>
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong>Cloudflare</strong>: application hosting, cached email data, search indexes,
            and AI processing (global network).
          </li>
          <li>
            <strong>Hetzner</strong>: the dedicated server in Germany that hosts our account
            database and its backups.
          </li>
          <li>
            <strong>Google</strong> (and any other email provider you connect): the source of your
            mail and sign-in.
          </li>
          <li>
            <strong>AI model providers</strong>, as described in &quot;AI Features&quot;.
          </li>
        </ul>
        <p>
          Your data may therefore be processed in the United States, the European Union and other
          countries where these providers operate.
        </p>
      </div>
    ),
  },
  {
    title: 'Security',
    content: (
      <ul className="ml-4 list-disc space-y-2">
        <li>All connections to EgorMail use HTTPS/TLS encryption.</li>
        <li>Our database accepts connections only over an encrypted, access-controlled tunnel.</li>
        <li>IMAP/SMTP passwords are encrypted before they are stored.</li>
        <li>Each account&apos;s mailbox data is kept in its own isolated storage.</li>
      </ul>
    ),
  },
  {
    title: 'Retention and Deletion',
    content: (
      <div className="space-y-4">
        <p>We keep your data for as long as your account is active.</p>
        <p>
          You can delete your account at any time from Settings. Deleting it removes your account,
          connected mailboxes, settings and assistant chat history from our active systems and
          revokes EgorMail&apos;s access to your Google account. Database backups are kept for up
          to 14 days and then expire. To have any remaining cached mail data erased, or for any
          other deletion request, email us at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </div>
    ),
  },
  {
    title: 'Cookies',
    content: (
      <p>
        EgorMail uses only the cookies needed to keep you signed in and secure. We do not use
        advertising or tracking cookies.
      </p>
    ),
  },
  {
    title: 'Your Rights',
    content: (
      <div className="space-y-4">
        <p>
          Depending on where you live, you may have the right to access, correct, export or delete
          your personal data, to object to or restrict certain processing, and to complain to your
          local data protection authority. To exercise any of these rights, email{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We will respond within 30 days.
        </p>
      </div>
    ),
  },
  {
    title: 'Children',
    content: (
      <p>
        EgorMail is not intended for children under 16, and we do not knowingly collect their data.
      </p>
    ),
  },
  {
    title: 'Changes to This Policy',
    content: (
      <p>
        We may update this policy from time to time. We will post the new version on this page
        with a new &quot;Last updated&quot; date, and notify you in the app or by email if the
        changes are significant.
      </p>
    ),
  },
  {
    title: 'Contact',
    content: (
      <p>
        Questions about this policy or your data? Email{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, or write to us at CloudComputerAI, c/o educationshop.org, 5348 Vegas Blvd #128, Las Vegas, NV 89108, United
        States.
      </p>
    ),
  },
];
