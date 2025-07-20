import { useParams } from 'react-router-dom';
import ThreadList from '@/components/forum/ThreadList';

export default function ForumCategory() {
  const { category } = useParams<{ category: string }>();

  return <ThreadList categorySlug={category} />;
}