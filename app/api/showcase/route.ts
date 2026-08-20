export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest){
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit')||'6'), 20)
  try{
    const videos = await prisma.video.findMany({
      where: { status: { in: ['completed','processing','queued'] as any } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id:true, title:true, topic:true, createdAt:true, status:true } as any
    })
    const mapped = videos.map((v:any)=>({
      id: v.id,
      title: v.title || v.topic || 'Untitled',
      topic: v.topic || '',
      videoUrl: `/showcase/${v.id}.mp4`,
      thumbnail: `/showcase/${v.id}.jpg`,
      createdAt: v.createdAt,
      status: v.status,
    }))
    if(mapped.length===0){
      return NextResponse.json([
        { id:'guest-demo1', title:'ঈদ অফার ৫০% ছাড়', topic:'y78 Bengali Shop', videoUrl:'/showcase/guest-demo1.mp4', thumbnail:'/showcase/guest-demo1.jpg', createdAt: new Date().toISOString(), status:'completed' },
      ])
    }
    return NextResponse.json(mapped)
  }catch(e:any){
    return NextResponse.json([{ id:'guest-demo1', title:'ঈদ অফার', topic:'y78', videoUrl:'/showcase/guest-demo1.mp4', thumbnail:'/showcase/guest-demo1.jpg', createdAt: new Date().toISOString(), status:'completed' }])
  }
}
