import dynamic from 'next/dynamic';

const SimpleChat = dynamic(() => import('../components/SimpleChat'), {
  ssr: false,
});

export default function Home() {
  return <SimpleChat />;
}