import { useRouter } from 'next/router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import MockInterviewSession from '@/components/job-tracker/MockInterviewSession';

export default function InterviewSessionDetail() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 mb-6"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back
        </button>
        <MockInterviewSession sessionId={id} />
      </div>
    </div>
  );
}

