package ru.partyhub

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.unit.dp
import kotlin.math.*
import kotlin.random.Random

@Composable fun WheelView(ids:List<Int>,winner:Int,startFraction:Float,animate:Boolean){
 if(ids.isEmpty())return
 val angle=remember{Animatable(startFraction.coerceIn(0f,1f))}
 LaunchedEffect(Unit){angle.animateTo(1f,tween(if(animate)((1-angle.value)*3400).toInt() else 0,easing=LinearEasing))}
 val step=360f/ids.size
 Text("▼   "+games[winner])
 Canvas(Modifier.fillMaxWidth().height(225.dp)){
  val radius=min(size.width,size.height)*.45f
  val paint=android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply{color=android.graphics.Color.rgb(40,49,36);textSize=radius*.083f;textAlign=android.graphics.Paint.Align.CENTER}
  val turn=(1800f-step*ids.indexOf(winner))*(1-(1-angle.value).pow(3))
  rotate(turn){ids.forEachIndexed{i,g->
   drawArc(listOf(Color(0xFFCCF18E),Color(0xFFF6C9B5),Color(0xFFBCB5EA),Color(0xFF9BDACF))[i%4],i*step-90-step/2,step,true,Offset(center.x-radius,center.y-radius),Size(radius*2,radius*2))
   rotate(step*i-90){drawContext.canvas.nativeCanvas.drawText(games[g].take(8),center.x+radius*.66f,center.y,paint)}
  }}
 }
}
@Composable fun VictoryArt(count:Int,mode:Int){
 if(count==0)return
 val t=remember{Animatable(0f)}
 val bits=remember(count,mode){val r=Random(mode+31);List(count){Triple(r.nextFloat(),r.nextFloat(),r.nextFloat())}}
 LaunchedEffect(Unit){t.animateTo(1f,tween(2700,easing=LinearEasing))}
 Canvas(Modifier.fillMaxWidth().height(76.dp)){if(t.value<1f)bits.forEachIndexed{i,p->
  val x=p.first*size.width+sin(p.third*6+t.value*5)*8
  val y=(p.second-1+t.value*2)*size.height
  drawCircle(listOf(Color(0xFFE4A72A),Color(0xFF9B78CC),Color(0xFF08A188))[(i+mode)%3],3f+4*p.third,Offset(x,y))
 }}
}
