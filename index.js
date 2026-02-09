import dynamic from 'next/dynamic'

const LobeChat = dynamic(() => import('@lobehub/chat').then(mod => mod.LobeChat), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function Home() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <LobeChat />
    </div>
  )
}