import { useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native' // 0 Taka Expo 51 — run via expo, not Next.js build
export default function App(){
  const [online,setOnline]=useState(false)
  return (
    <ScrollView style={{flex:1, backgroundColor:'#F8FAFC', padding:16}}>
      <Text style={{fontWeight:'bold', color:'#0E7C3A', fontSize:18}}>Hostamar Node • Phone Datacenter</Text>
      <Text style={{color:'#64748B', fontSize:12}}>credit 6000/6000 • 6 products • Tailscale 100.89.x.x</Text>
      <View style={{marginTop:12, backgroundColor:'#0E7C3A', borderRadius:16, padding:16}}>
        <Text style={{color:'white', fontSize:11, letterSpacing:2}}>CREDIT 6000/6000 79%</Text>
        <View style={{height:8, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:999, marginTop:8}}><View style={{height:8, width:'79%', backgroundColor:'white', borderRadius:999}}/></View>
      </View>
      <View style={{flexDirection:'row', gap:8, marginTop:12}}>
        <View style={{flex:1, borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, padding:12, alignItems:'center'}}><Text style={{fontSize:12}}>Windows</Text><Text style={{color: online?'#0E7C3A':'#EF4444', fontWeight:'bold'}}>{online?'ONLINE':'OFFLINE'}</Text></View>
        <View style={{flex:1, borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, padding:12, alignItems:'center'}}><Text style={{fontSize:12}}>Phone</Text><Text style={{color:'#0E7C3A', fontWeight:'bold'}}>ONLINE 100.89.x.x</Text></View>
      </View>
      <View style={{flexDirection:'row', gap:8, marginTop:12}}>
        <Pressable onPress={()=>setOnline(true)} style={{flex:1, backgroundColor:'#0E7C3A', borderRadius:999, padding:12, alignItems:'center'}}><Text style={{color:'white', fontWeight:'bold'}}>Start Tunnel</Text></Pressable>
        <Pressable onPress={()=>setOnline(true)} style={{flex:1, backgroundColor:'#2563EB', borderRadius:999, padding:12, alignItems:'center'}}><Text style={{color:'white', fontWeight:'bold'}}>Start Gateway</Text></Pressable>
      </View>
      <View style={{flexDirection:'row', gap:8, marginTop:8}}>
        <Pressable style={{flex:1, backgroundColor:'#F59E0B', borderRadius:999, padding:12, alignItems:'center'}}><Text style={{color:'white', fontWeight:'bold'}}>Start Worker</Text></Pressable>
        <Pressable onPress={()=>setOnline(false)} style={{flex:1, backgroundColor:'#E2E8F0', borderRadius:999, padding:12, alignItems:'center'}}><Text>Stop All</Text></Pressable>
      </View>
      <View style={{marginTop:12, backgroundColor:'black', borderRadius:12, padding:12}}><Text style={{color:'#4ADE80', fontSize:11}}>Fix: cloudflared tunnel run hostamar-app (NOT --name){'\n'}Fix: python C:\hostamar\gateway.py{'\n'}Tailscale 100.x mesh • no JumpServer</Text></View>
      <Text style={{marginTop:12, backgroundColor:'#0F172A', color:'white', padding:12, borderRadius:12, textAlign:'center'}}>Phone serves browser/comfy when PC down</Text>
    </ScrollView>
  )
}
