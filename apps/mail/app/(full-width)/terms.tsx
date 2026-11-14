import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Link2 } from 'lucide-react';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import Footer from '@/components/home/footer';
import { createSectionId } from '@/lib/utils';

const LAST_UPDATED = 'November 14, 2026';

export default function TermsOfService() {
  const { copiedValue: copiedSection, copyToClipboard } = useCopyToClipboard();

  const handleCopyLink = (sectionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    copyToClipboard(url, sectionId);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-auto bg-white dark:bg-[#111111]">
      <Navigation />
      <div className="relative z-10 flex grow flex-col">
        {/* Back Button */}
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
                  Terms of Service
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
    title: 'Agreement',
    content: (
      <p>
        These Terms of Service govern your use of EgorMail, an email client operated by
        CloudComputerAI (&quot;we&quot;, &quot;us&quot;), available at email.egorai.com. By
        creating an account or using EgorMail you agree to these terms and to our{' '}
        <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use EgorMail.
      </p>
    ),
  },
  {
    title: 'The Service',
    content: (
      <div className="space-y-4">
        <p>
          EgorMail lets you read, organize, write and send email from accounts you connect, with
          optional AI features such as summaries, suggested drafts, auto-labels and the Egor
          assistant. EgorMail is in early access: features may change, be added or be removed, and
          the service may occasionally be unavailable.
        </p>
        <p>
          EgorMail is built on the open-source Zero project, which is licensed under the MIT
          License. These terms govern our hosted service, not your rights under that license.
        </p>
      </div>
    ),
  },
  {
    title: 'Your Account',
    content: (
      <ul className="ml-4 list-disc space-y-2">
        <li>You must be at least 16 years old to use EgorMail.</li>
        <li>
          You must have the right to access every mailbox you connect, and you are responsible for
          activity in your account.
        </li>
        <li>Keep your sign-in credentials secure and tell us promptly about any unauthorized use.</li>
      </ul>
    ),
  },
  {
    title: 'Acceptable Use',
    content: (
      <div className="space-y-4">
        <p>You agree not to use EgorMail to:</p>
        <ul className="ml-4 list-disc space-y-2">
          <li>send spam, phishing, malware or other unsolicited or deceptive messages;</li>
          <li>break the law or infringe anyone else&apos;s rights, including privacy and intellectual property;</li>
          <li>access mailboxes or data you are not authorized to access;</li>
          <li>interfere with, overload or probe the service, or bypass its security or usage limits;</li>
          <li>violate the terms of your email provider (such as Google) or of the AI providers we use.</li>
        </ul>
        <p>We may suspend or close accounts that break these rules.</p>
      </div>
    ),
  },
  {
    title: 'AI Features',
    content: (
      <div className="space-y-4">
        <p>
          AI-generated summaries, labels, answers and drafts can be inaccurate or incomplete.
          Review them before relying on them. Drafts suggested by EgorMail are not sent unless you
          send them or approve sending.
        </p>
        <p>
          You are responsible for the email you send from EgorMail, including messages drafted
          with AI. You can turn AI features off in Settings.
        </p>
      </div>
    ),
  },
  {
    title: 'Your Content',
    content: (
      <p>
        Your email and other content remain yours. You give us permission to store, process and
        transmit your content only as needed to provide EgorMail to you, as described in our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    ),
  },
  {
    title: 'Fees',
    content: (
      <p>
        EgorMail is currently free during early access. If we introduce paid plans, we will tell
        you the price and terms before you are charged, and you can choose whether to subscribe.
      </p>
    ),
  },
  {
    title: 'Ending Your Use',
    content: (
      <p>
        You can stop using EgorMail and delete your account at any time from Settings. We may
        suspend or end your access if you break these terms, if required by law, or if we
        discontinue the service, in which case we will try to give you reasonable notice so you
        can move your data.
      </p>
    ),
  },
  {
    title: 'Disclaimers',
    content: (
      <p>
        EgorMail is provided &quot;as is&quot; and &quot;as available&quot;, without warranties
        of any kind, whether express or implied, including warranties of merchantability, fitness
        for a particular purpose and non-infringement. We do not guarantee that the service will be
        uninterrupted, error-free or that no email will be lost. Your original mail remains with
        your email provider.
      </p>
    ),
  },
  {
    title: 'Limitation of Liability',
    content: (
      <p>
        To the fullest extent permitted by law, CloudComputerAI will not be liable for any
        indirect, incidental, special, consequential or punitive damages, or for any loss of data,
        profits or business, arising from your use of EgorMail. Our total liability for any claim
        relating to the service is limited to the greater of the amount you paid us in the 12
        months before the claim or US$50. Some jurisdictions do not allow these limits, so they may
        not apply to you.
      </p>
    ),
  },
  {
    title: 'Changes to These Terms',
    content: (
      <p>
        We may update these terms. We will post the new version on this page with a new &quot;Last
        updated&quot; date and notify you in the app or by email if the changes are significant.
        Continuing to use EgorMail after changes take effect means you accept them.
      </p>
    ),
  },
  {
    title: 'Contact',
    content: (
      <p>
        Questions about these terms? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    ),
  },
];
