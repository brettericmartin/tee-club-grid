import { useParams } from 'react-router-dom';
import ThreadView from '@/components/forum/ThreadView';

export default function ForumThread() {
  const { category, thread } = useParams<{ category: string; thread: string }>();

  return <ThreadView threadId={thread!} categorySlug={category} />;
}