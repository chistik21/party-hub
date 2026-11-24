package ru.partyhub

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.net.nsd.*
import android.os.Bundle
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas as BitmapCanvas
import android.media.AudioManager
import android.media.ToneGenerator
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import com.caverock.androidsvg.SVG
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.SecureRandom
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class Main:ComponentActivity(){override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);enableEdgeToEdge();setContent{HubApp()}}}
val games="Шпион|Мафия|Реакция|Мем-батл|Викторина|Правда или ложь|Угадай число|Ассоциации|Кто из нас?|Словесная битва|Память|Найди отличие|Цветовой хаос|Змейка Online|Марафон".split('|')
val faces=listOf("🦊","🐼","🐸","🐯","🐰","🐙","🦁","🐨","🐧","🐻","🐱","🦄")
fun JSONObject.rows(k:String):List<JSONObject>{val a=optJSONArray(k)?:return emptyList();return (0 until a.length()).map{a.getJSONObject(it)}}
fun strings(a:JSONArray?):List<String> = if(a==null)emptyList() else (0 until a.length()).map{a.getString(it)}
@Composable fun Btn(t:String,on:Boolean=true,click:()->Unit){val tap=LocalTap.current;Button(onClick={tap();click()},enabled=on){Text(t)}}
@Composable fun Pick(t:String,items:List<String>,index:Int,fn:(Int)->Unit){var open by remember{mutableStateOf(false)};Box{OutlinedButton(onClick={open=true}){Text("$t · "+items.getOrElse(index){"Выбрать"})};DropdownMenu(open,{open=false}){items.forEachIndexed{i,x->DropdownMenuItem(text={Text(x)},onClick={open=false;fn(i)})}}}}
@Composable fun Art(path:String){
 val c=LocalContext.current
 val bmp=remember(path){runCatching{if(path.startsWith("data:")){val b=android.util.Base64.decode(path.substringAfter(','),0);BitmapFactory.decodeByteArray(b,0,b.size)}else{val b=Bitmap.createBitmap(480,288,Bitmap.Config.ARGB_8888);c.assets.open("site/"+path.removePrefix("/")).use{SVG.getFromInputStream(it).renderToCanvas(BitmapCanvas(b))};b}}.getOrNull()}
 bmp?.let{Image(it.asImageBitmap(),null,Modifier.fillMaxWidth().height(144.dp))}
}
@Composable fun Qr(address:String){val bmp=remember(address){val m=QRCodeWriter().encode(address,BarcodeFormat.QR_CODE,256,256);Bitmap.createBitmap(IntArray(65536){if(m[it%256,it/256])android.graphics.Color.BLACK else android.graphics.Color.WHITE},256,256,Bitmap.Config.ARGB_8888)};Image(bmp.asImageBitmap(),"QR-код",Modifier.size(170.dp));Text(address)}
@Composable fun HubApp(){
 val c=LocalContext.current;val pref=remember{c.getSharedPreferences("hub",Context.MODE_PRIVATE)}
 val key=remember{pref.getString("key",null)?:ByteArray(24).also{SecureRandom().nextBytes(it)}.joinToString(""){"%02x".format(it)}.also{pref.edit().putString("key",it).apply()}}
 var endpoint by rememberSaveable{mutableStateOf(pref.getString("server","http://127.0.0.1:3000")!!)}
 var address by rememberSaveable{mutableStateOf(endpoint)};var page by rememberSaveable{mutableStateOf("Играть")};var nick by rememberSaveable{mutableStateOf(pref.getString("nick","Игрок")!!)}
 var avatar by rememberSaveable{mutableIntStateOf(pref.getInt("avatar",0))};var code by rememberSaveable{mutableStateOf("")};var observer by rememberSaveable{mutableStateOf(false)}
 var room by remember{mutableStateOf<JSONObject?>(null)};var career by remember{mutableStateOf(JSONObject())};var online by remember{mutableStateOf(false)}
 var pending by rememberSaveable{mutableStateOf(false)};var msg by remember{mutableStateOf("")};var preview by rememberSaveable{mutableIntStateOf(-1)}
 var now by remember{mutableLongStateOf(System.currentTimeMillis())};var offset by remember{mutableLongStateOf(0)}
 val api=remember{Client(key,{d->if(d.has("state")){room=d.optJSONObject("state");room?.let{pending=false;offset=it.optLong("now")-System.currentTimeMillis()}};if(d.has("career"))career=d.getJSONObject("career");if(d.has("error")){msg=d.optString("error");pending=false}},{online=it})}
 LaunchedEffect(endpoint){api.open(endpoint);pref.edit().putString("server",endpoint).apply()};DisposableEffect(Unit){onDispose{api.dispose()}}
 LaunchedEffect(online,pending){if(online&&pending&&endpoint=="http://127.0.0.1:3000"){delay(250);if(room==null){api.send("enter","code" to null,"name" to nick,"avatar" to avatar);pending=false}}}
 LaunchedEffect(Unit){while(true){now=System.currentTimeMillis();delay(700)}}
 val scan=rememberLauncherForActivityResult(ScanContract()){r->r.contents?.let{runCatching{val u=Uri.parse(it);require(u.scheme=="http"&&u.host!=null);address="http://"+u.encodedAuthority;endpoint=address;code=u.getQueryParameter("room")?:"";page="Подключение"}.onFailure{msg="Некорректная ссылка"}}}
 val notify=rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()){}
 fun host(){if(android.os.Build.VERSION.SDK_INT>=33)notify.launch(Manifest.permission.POST_NOTIFICATIONS);c.startForegroundService(Intent(c,HostService::class.java))}
 val scope=rememberCoroutineScope()
 val backup=rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/zip")){u->if(u!=null)runCatching{c.contentResolver.openOutputStream(u)!!.use{stream->ZipOutputStream(stream).use{z->File(c.filesDir,"profiles").listFiles()?.filter{it.extension=="json"}?.forEach{f->z.putNextEntry(ZipEntry(f.name));z.write(f.readBytes());z.closeEntry()}}};msg="Копия сохранена"}.onFailure{msg="Ошибка записи"}}
 val upload=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){u->if(u!=null)runCatching{val opts=BitmapFactory.Options().apply{inJustDecodeBounds=true};c.contentResolver.openInputStream(u)!!.use{BitmapFactory.decodeStream(it,null,opts)};opts.inJustDecodeBounds=false;while(maxOf(opts.outWidth,opts.outHeight)/opts.inSampleSize.coerceAtLeast(1)>650)opts.inSampleSize=opts.inSampleSize.coerceAtLeast(1)*2;val b=c.contentResolver.openInputStream(u)!!.use{BitmapFactory.decodeStream(it,null,opts)}?:error("Фото");val stream=java.io.ByteArrayOutputStream();b.compress(Bitmap.CompressFormat.JPEG,65,stream);api.send("image","value" to "data:image/jpeg;base64,"+android.util.Base64.encodeToString(stream.toByteArray(),2));b.recycle()}.onFailure{msg="Не удалось открыть фото"}}
 val found=remember{mutableStateListOf<String>()}
 DisposableEffect(page){val discovering=page=="Подключение";val nsd=c.getSystemService(NsdManager::class.java)!!
 val listener=object:NsdManager.DiscoveryListener{
 override fun onServiceFound(i:NsdServiceInfo){nsd.resolveService(i,object:NsdManager.ResolveListener{override fun onResolveFailed(s:NsdServiceInfo,e:Int){};override fun onServiceResolved(s:NsdServiceInfo){val url="http://"+s.host.hostAddress+":"+s.port;api.main.post{if(url !in found)found.add(url)}}})}
 override fun onServiceLost(i:NsdServiceInfo){};override fun onDiscoveryStarted(t:String){};override fun onDiscoveryStopped(t:String){};override fun onStartDiscoveryFailed(t:String,e:Int){};override fun onStopDiscoveryFailed(t:String,e:Int){}
 };if(discovering)runCatching{nsd.discoverServices("_partyhub._tcp.",NsdManager.PROTOCOL_DNS_SD,listener)};onDispose{if(discovering)runCatching{nsd.stopServiceDiscovery(listener)}}}
 val palettes=remember{JSONObject(c.assets.open("core/design.json").bufferedReader().readText())};val paletteKeys=remember{palettes.keys().asSequence().toList()};var theme by remember{mutableStateOf(pref.getString("theme","dynamic")!!)}
 var policy by remember{mutableStateOf(pref.getString("policy","Вручную")!!)};val random=remember{(0 until paletteKeys.size).random()}
 var sound by remember{mutableStateOf(pref.getBoolean("sound",true))}
 var volume by remember{mutableFloatStateOf(pref.getFloat("vol",.45f))};var music by remember{mutableStateOf(pref.getBoolean("music",false))}
 var vibration by remember{mutableStateOf(pref.getBoolean("vib",true))};val view=androidx.compose.ui.platform.LocalView.current
 val audio=remember{HubSound(c)};DisposableEffect(Unit){onDispose{audio.release()}}
 DisposableEffect(music,volume,view){val listener=android.view.ViewTreeObserver.OnWindowFocusChangeListener{focus->audio.background(music&&focus,volume)};view.viewTreeObserver.addOnWindowFocusChangeListener(listener);audio.background(music&&view.hasWindowFocus(),volume);onDispose{if(view.viewTreeObserver.isAlive)view.viewTreeObserver.removeOnWindowFocusChangeListener(listener);audio.background(false,0f)}}
 fun play(id:String){if(sound)audio.play(id,volume)}
 LaunchedEffect(room?.optInt("epoch")){if(room!=null){val phase=room?.optString("phase");play(when(phase){"Финал"->"win";"Колесо"->"wheel";"Отсчёт"->"count";"Итоги раунда"->"timeout";else->"start"});if(phase=="Финал")api.send("profile")}}
 val selected=when(policy){"Системная"->if(isSystemInDarkTheme())"midnight" else "arctic";"По часам"->if(java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY) in 7..18)"arctic" else "midnight";"При запуске"->paletteKeys[random];"После матча"->paletteKeys[(random+career.optInt("matches"))%paletteKeys.size];"По раундам"->paletteKeys[(random+(room?.optInt("round")?:0))%paletteKeys.size];"Как у ведущего"->room?.optString("theme")?:theme;else->theme}
 val pal=palettes.optJSONObject(selected)?:palettes.getJSONObject("expressive");fun color(k:String)=Color(android.graphics.Color.parseColor(pal.getString(k)))
 val levels=listOf("Автоматический","Экономичный","Сбалансированный","Максимальный")
 var quality by remember{mutableIntStateOf(pref.getInt("quality",0))}
 var grade by remember{mutableIntStateOf(2)}
 LaunchedEffect(quality){
  grade=if(quality>0)quality else if(Runtime.getRuntime().availableProcessors()<=4)1 else 3
  if(quality==0){var last=withFrameNanos{it};var frames=0;var slow=0
   while(grade>1){val time=withFrameNanos{it};frames++
    if(time-last>=2_000_000_000L){val fps=frames*1e9/(time-last);slow=if(fps<40)slow+1 else 0;if(slow>=2){grade--;slow=0};frames=0;last=time}}
  }
 }
 val motion=grade>1 && android.provider.Settings.Global.getFloat(c.contentResolver,android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,1f)>0f
 val scheme=if(selected=="dynamic"&&android.os.Build.VERSION.SDK_INT>=31)dynamicLightColorScheme(c) else lightColorScheme(primary=color("ink"),onPrimary=color("bg"),background=color("bg"),onBackground=color("ink"),surface=color("bg"),onSurface=color("ink"),secondaryContainer=color("accent"))
 BackHandler(enabled=room!=null||page!="Играть"||preview>=0){if(preview>=0)preview=-1 else if(room!=null)page="Выход" else page="Играть"}
 MaterialTheme(colorScheme=scheme){CompositionLocalProvider(LocalContentColor provides scheme.onBackground, LocalTap provides {play("tap");if(vibration)view.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY);Unit}){Column(Modifier.fillMaxSize().background(scheme.background).safeDrawingPadding().verticalScroll(rememberScrollState()).padding(18.dp),verticalArrangement=Arrangement.spacedBy(9.dp)){
 Text("PARTY HUB",fontSize=29.sp,color=scheme.primary,fontWeight=androidx.compose.ui.text.font.FontWeight.Black);Text(if(online)"● В сети" else "○ Ожидаем сервер")
 if(msg.isNotBlank())TextButton(onClick={msg=""}){Text(msg+" ×")}
 val s=room
 if(page=="Выход"&&s!=null){Text("Выйти из комнаты?");Btn("Остаться"){page="Играть"};Btn("Выйти"){api.send("leave");page="Играть"}}
 else if(s==null){
 Pick("Раздел",listOf("Играть","Подключение","Сервер","Профиль","Настройки"),listOf("Играть","Подключение","Сервер","Профиль","Настройки").indexOf(page)){page=listOf("Играть","Подключение","Сервер","Профиль","Настройки")[it]}
 if(page=="Играть"||page=="Подключение"){
 OutlinedTextField(nick,{nick=it.take(20);pref.edit().putString("nick",nick).apply()},label={Text("Имя")});Pick("Аватар",faces,avatar){avatar=it;pref.edit().putInt("avatar",it).apply()}
 if(page=="Играть"){Btn("Создать вечеринку",nick.isNotBlank()){host();endpoint="http://127.0.0.1:3000";pending=true};Btn("Присоединиться"){page="Подключение"};Text("Каталог игр",fontSize=24.sp);games.chunked(2).forEachIndexed{r,pair->Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){pair.forEachIndexed{j,n->Card(onClick={preview=r*2+j},modifier=Modifier.weight(1f)){Art("/cards/"+(r*2+j)+".svg");Text(n,Modifier.padding(8.dp))}}}}}
 else{Btn("Сканировать QR"){scan.launch(ScanOptions().setPrompt("Наведи камеру на код комнаты"))};found.forEach{Btn(it){address=it;endpoint=it}};OutlinedTextField(address,{address=it},label={Text("Адрес · http://IP:3000")});Btn("Подключить сервер"){val url=if(address.contains("://"))address else "http://"+address;endpoint=url;api.open(url)};OutlinedTextField(code,{code=it.filter(Char::isDigit).take(2)},label={Text("Код комнаты")});Row{Checkbox(observer,{observer=it});Text("Зритель")};Btn("Войти",online&&code.length==2){api.send("enter","code" to code,"name" to nick,"avatar" to avatar,"watch" to observer)};if(!online)Text("Проверь Wi-Fi, IP и доступ между устройствами точки доступа.")}}
 if(page=="Сервер"){val h=HostService.host;Text(if(h==null)"Остановлен" else "Работает · "+(now-HostService.started)/1000+" с");Text(addresses().joinToString("\n"));if(h!=null){val info=runCatching{JSONObject(h.info())}.getOrDefault(JSONObject());Text("Комнат: "+info.optInt("rooms")+" · Подключений: "+info.optInt("connections"))};Btn("Запустить",h==null){host()};Btn("Остановить",h!=null){c.stopService(Intent(c,HostService::class.java))};Btn("Перезапустить",h!=null){c.stopService(Intent(c,HostService::class.java));scope.launch{delay(600);host()}};Btn("Экспорт статистики"){backup.launch("PARTY-HUB-профили.zip")};Text(HostService.journal())}
 if(page=="Настройки"){Pick("Графика",levels,quality){quality=it;pref.edit().putInt("quality",it).apply()};Pick("Тема",paletteKeys.map{palettes.getJSONObject(it).getString("name")},paletteKeys.indexOf(theme)){theme=paletteKeys[it];policy="Вручную";pref.edit().putString("theme",theme).putString("policy",policy).apply()};val policies=listOf("Вручную","Системная","По часам","При запуске","После матча","По раундам","Как у ведущего");Pick("Смена темы",policies,policies.indexOf(policy)){policy=policies[it];pref.edit().putString("policy",policy).apply()};Text("Громкость");Slider(value=volume,onValueChange={volume=it},onValueChangeFinished={pref.edit().putFloat("vol",volume).apply()});Btn("Музыка · "+(if(music)"вкл" else "выкл")){music=!music;pref.edit().putBoolean("music",music).apply()};Btn("Вибрация · "+(if(vibration)"вкл" else "выкл")){vibration=!vibration;pref.edit().putBoolean("vib",vibration).apply()};Btn(if(sound)"Звук включён" else "Звук выключен"){sound=!sound;pref.edit().putBoolean("sound",sound).apply()}}
 if(page=="Профиль"){Text(nick+" · уровень "+career.optInt("level",1));Text(career.optString("title")+" · "+career.optString("frame"));val stats=career.optJSONObject("games")?:JSONObject();stats.keys().asSequence().toList().sortedByDescending{stats.getJSONObject(it).getInt("plays")}?.forEach{k->val g=stats.getJSONObject(k);Text(games[k.toInt()]+" · игр "+g.optInt("plays")+" · рекорд "+g.optInt("best"))};Text("Побед: "+career.optInt("wins")+" · Опыт: "+career.optInt("points"));career.rows("history").take(20).forEach{Text(games[it.getInt("mode")]+" · "+it.getInt("points")+" очк.")};Text("Достижения");career.rows("badges").forEach{Text((if(it.getBoolean("ok"))"★ " else "◇ ")+it.getString("title"))}}
 }else{
 val phase=s.getString("phase");val id=s.getString("id");val isHost=id==s.getString("host");val people=s.rows("people");val me=people.first{it.getString("id")==id};val mode=s.getInt("mode");val g=s.getInt("game");val lobby=phase=="Лобби"
 fun opts(m:Int=mode,r:Int=s.getInt("rounds"),t:Int=s.getInt("seconds"),cat:String=s.optString("category")){api.send("options","category" to cat,"mode" to m,"rounds" to r,"seconds" to t,"theme" to selected)}
 Text("Комната "+s.getString("code"),fontSize=28.sp);var invite by remember{mutableStateOf(false)};Btn("Позвать друзей"){invite=!invite};if(invite){val base=if(endpoint.contains("127.0.0.1"))addresses().firstOrNull()?:endpoint else endpoint;Qr(base+"/?room="+s.getString("code"))}
 if(lobby){Text(games[mode],fontSize=26.sp);if(isHost){Pick("Режим",games,mode){opts(m=it)};if(mode==4){val cats=listOf("","Арифметика","Геометрия","Время","Счёт","География","Природа","Космос","Культура");Pick("Категория",cats.map{it.ifEmpty{"Все категории"}},cats.indexOf(s.optString("category"))){opts(cat=cats[it])}};Pick("Раундов",listOf("1","3","5"),listOf(1,3,5).indexOf(s.getInt("rounds"))){opts(r=listOf(1,3,5)[it])};Pick("Секунд",listOf("15","30","60"),listOf(15,30,60).indexOf(s.getInt("seconds"))){opts(t=listOf(15,30,60)[it])};Btn("Принять голосование",people.any{it.optInt("vote",-1)>=0}){api.send("votes")};Btn("Крутить колесо"){api.send("wheel")};Pick("Включить / исключить",games.mapIndexed{i,n->(if(s.getJSONArray("excluded").toString().let{strings(s.optJSONArray("excluded")).contains(i.toString())})"− " else "+ ")+n},-1){api.send("exclude","value" to it)};if(mode==3)Btn("Загрузить картинку"){upload.launch("image/*")}}
 if(!me.getBoolean("watch")){Pick("Голос за режим",games,me.optInt("vote",-1)){api.send("voteMode","value" to it)};Btn(if(isHost)"Начать игру" else if(me.getBoolean("ready"))"Отменить готовность" else "Готов"){api.send(if(isHost)"start" else "ready")}}}
 else if(phase=="Колесо"){WheelView(strings(s.optJSONArray("sectors")).map{it.toInt()},mode,1f-(s.optLong("until")-now-offset)/3400f,motion)}
 else if(phase=="Финал"){VictoryArt(if(!motion)0 else if(grade==3)64 else 30,g);Text("Итоги вечеринки",fontSize=28.sp);people.filterNot{it.optBoolean("watch")}.sortedByDescending{it.optInt("score")}.forEachIndexed{i,p->Text((listOf("🥇 ","🥈 ","🥉 ").getOrElse(i){""})+p.getString("name")+" · "+p.optInt("score"))};if(isHost)Btn("В лобби и реванш"){api.send("again")}}
 else{Text(games[g]+" · "+phase);Text(if(s.optLong("until")>0)"Осталось "+((s.getLong("until")-now-offset+999)/1000).coerceAtLeast(0)+" с" else "");Text(s.optString("prompt"),fontSize=23.sp,color=if(s.optString("tint").isNotBlank())Color(android.graphics.Color.parseColor(s.getString("tint")))else scheme.onSurface);Text(s.optString("role")+" "+s.optString("info"));if(s.optString("image").isNotEmpty())Art(s.getString("image"));Text(strings(s.optJSONArray("seq")).joinToString(" "))
 if(g==13){Canvas(Modifier.fillMaxWidth().aspectRatio(32f/24).background(Color.DarkGray)){val w=size.width/32;fun cell(n:Int,c:Color){drawRect(c,Offset(n.rem(32)*w,n.div(32)*w),Size(w,w))};strings(s.optJSONArray("food")).forEach{cell(it.toInt(),Color.Yellow)};val snakes=s.getJSONObject("snakes");snakes.keys().forEach{k->val snake=snakes.getJSONObject(k);if(snake.getBoolean("alive"))strings(snake.optJSONArray("body")).forEach{cell(it.toInt(),if(k==id)Color.Green else Color.Cyan)}}}}
 if(s.optBoolean("can")){var value by remember(s.optInt("epoch")){mutableStateOf("")};fun answer(v:String){api.send("answer","epoch" to s.optInt("epoch"),"value" to v);value=""};val choices=s.optJSONArray("options")?:JSONArray();(0 until choices.length()).chunked(if(g==11)5 else 2).forEach{row->Row{row.forEach{i->val o=choices.getJSONArray(i);TextButton(onClick={if(g==10)value+=o.getString(0) else answer(o.getString(0))},modifier=Modifier.weight(1f)){Text(o.getString(1))}}}};if(choices.length()==0||g==10){OutlinedTextField(value,{value=it.take(140)},readOnly=g==10,label={Text("Ответ")});if(g==10)Btn("Сброс"){value=""};Btn("Сдать",value.isNotBlank()){answer(value)}}}}
 people.forEach{p->Text(faces[p.optInt("avatar")]+" "+p.getString("name")+(if(p.getString("id")==s.getString("host"))" ♛" else "")+" · "+(if(p.optBoolean("ready"))"Готов" else if(p.optBoolean("watch"))"Зритель" else p.optInt("rtt").toString()+" мс"));if(isHost&&lobby&&p.getString("id")!=id)TextButton(onClick={api.send("kick","id" to p.getString("id"))}){Text("Исключить")}}
 var chat by remember{mutableStateOf("")};strings(s.optJSONArray("chat")).takeLast(10).forEach{Text(it)};OutlinedTextField(chat,{chat=it.take(160)},label={Text("Чат")});Btn("Отправить",chat.isNotBlank()){api.send("chat","value" to chat);chat=""};Btn("👏"){api.send("react","value" to "👏")};Btn("Выйти"){page="Выход"}
 }
 if(preview>=0)AlertDialog(onDismissRequest={preview=-1},title={Text(games[preview])},text={Art("/cards/$preview.svg")},confirmButton={TextButton(onClick={preview=-1}){Text("Закрыть")}})
 }}}
}
