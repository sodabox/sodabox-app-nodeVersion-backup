var SODABOX_defaultInfo={_SODABOX_appurl:"http://sodabox.allypost.com:3300",_SODABOX_socketurl:"http://sodaboxsocket.allypost.com:3400",_SODABOX_channel:"CH001",_SODABOX_divName:"SODABOX_SCREEN",_SODABOX_range:"PAGE"},SODABOX_utils={getHashCode:function(e){var t=0;if(e.length===0)return t;for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);t=(t<<5)-t+r,t&=t}return t},loadScript:function(e,t){var n=document.createElement("script");n.type="text/javascript",n.readyState?n.onreadystatechange=function(){(n.readyState=="loaded"||n.readyState=="complete")&&t()}:n.onload=function(){t()},n.src=e,document.getElementsByTagName("head")[0].appendChild(n)},loadJson:function(e,t){var n=document.createElement("script");n.type="text/javascript",n.charset="utf-8",n.id=this.getHashCode(e),n.readyState?n.onreadystatechange=function(){n.readyState=="loaded"||n.readyState=="complete"}:n.onload=function(){},n.src=e+"?_callback="+t+"&_noCacheIE="+(new Date).getTime(),document.getElementsByTagName("head")[0].appendChild(n)},sendMessage:function(e){var t=document.createElement("script");t.type="text/javascript",t.charset="utf-8",t.id=this.getHashCode(e),t.readyState?t.onreadystatechange=function(){t.readyState=="loaded"||t.readyState=="complete"}:t.onload=function(){},t.src=e+"&_noCacheIE="+(new Date).getTime(),document.getElementsByTagName("head")[0].appendChild(t)}},SODABOX_window={rootDivName:"",imageServer:"",textareaHeight:-1,isLogined:!1,cntNotLogined:0,cntLogined:0,hasClass:function(e,t){return e.className.match(new RegExp("(\\s|^)"+t+"(\\s|$)"))},addClass:function(e,t){this.hasClass(e,t)||(e.className+=" "+t)},removeClass:function(e,t){if(this.hasClass(e,t)){var n=new RegExp("(\\s|^)"+t+"(\\s|$)");e.className=e.className.replace(n," ")}},replaceClass:function(e,t,n){this.hasClass(e,t)&&(this.removeClass(e,t),this.addClass(e,n));return},toggleClass:function(e,t,n){this.hasClass(e,t)?this.replaceClass(e,t,n):this.hasClass(e,n)?this.replaceClass(e,n,t):this.addClass(e,t)},initWin:function(e,t){this.rootDivName=e,this.imageServer=t;var n=document.getElementById(e);n===null&&(n=document.createElement("div"),n.id=e,this.addClass(n,"sodabox"),document.getElementsByTagName("body")[0].appendChild(n)),n.innerHTML='<div id="'+e+'_head" class="sodabox_head" onclick="javascript:return SODABOX_window.toggleChatBoxGrowth();" >'+'<div id="'+e+'_title" class="sodabox_title"></div>'+"</div>"+'<div id="'+e+'_content" class="sodabox_content"></div>'+'<div id="'+e+'_login" class="sodabox_input">&nbsp;&nbsp;Sign In with '+'<a href="#" alt="If you would like to chat, sign in with Facebook or Twitter" onclick="return !window.open(SODABOX.getOauthUrl(\'facebook\'),\'SODABOX_OAUTH\',\'menubar=no,location=no,resizable=yes,scrollbars=yes,status=yes,width=800,height=450\')" target="_blank"><img src="'+this.imageServer+'/images/facebook.png"  alt="If you would like to chat, sign in with Facebook or Twitter" style="cursor:pointer;" /></a>&nbsp;or&nbsp;'+'<a href="#" alt="If you would like to chat, sign in with Facebook or Twitter" onclick="return !window.open(SODABOX.getOauthUrl(\'twitter\'),\'SODABOX_OAUTH\',\'menubar=no,location=no,resizable=yes,scrollbars=yes,status=yes,width=800,height=450\')" target="_blank"><img src="'+this.imageServer+'/images/twitter.png"  alt="If you would like to chat, sign in with Facebook or Twitter" style="cursor:pointer;" /></a>&nbsp;to chat with each other'+"</div>"+'<div id="'+e+'_input" class="sodabox_input"><textarea id="'+e+'_textarea" class="sodabox_textarea" onkeydown="javascript:return SODABOX_window.inputChatMessage(event,this);" ></textarea></div>',n.style.bottom="0px",n.style.right="20px",textareaHeight=document.getElementById(e+"_textarea").style.height;var r=document.getElementById(e+"_content"),i=document.getElementById(e+"_login"),s=document.getElementById(e+"_input");r.style.display="none",i.style.display="none",s.style.display="none",n.onclick=function(){if(r.style.display!="none"&&s.style.display!="none"){var t=document.getElementById(e+"_textarea");t.focus(),t.value=t.value}},n.style.display="none"},showRootDiv:function(e){var t=document.getElementById(this.rootDivName);e?t.style.display="block":t.style.display="none"},inputChatMessage:function(e,t){if(e.keyCode==13&&!e.shiftKey){e.preventDefault?e.preventDefault():e.returnValue=!1;var n=t.value;n=n.replace(/^\s+|\s+$/g,"");if(n.length>0)return n=="#logout"||n=="/logout"?SODABOX.logout():SODABOX.sendMessage(encodeURIComponent(n)),t.value="",t.style.height="30px",!1}var r=t.clientHeight,i=94;i>r?(r=Math.max(t.scrollHeight,r),i&&(r=Math.min(i,r)),r>t.clientHeight&&(t.style.height=r+8+"px")):t.style.overflow="auto"},setChatMessage:function(e,t){var n=document.getElementById(this.rootDivName+"_content"),r=document.createElement("div");this.addClass(r,"sodabox_message"),r.innerHTML='<span class="sodabox_messagefrom"><a target="_blank" href="'+e.link+'" class="sodabox_userlink" alt="GO TO User Page!">'+e.name+'</a>:&nbsp;&nbsp;</span><span class="sodabox_messagecontent">'+t+'</span>&nbsp;&nbsp;&nbsp;<span class="sodabox_messagetime">'+this.getNowStr()+"</span>",n.appendChild(r),n.scrollTop=n.scrollHeight,document.getElementById(this.rootDivName+"_content").style.display!="block"&&(document.getElementById(this.rootDivName+"_title").innerHTML="<b>Online Users : "+(this.cntNotLogined+this.cntLogined)+"</b>&nbsp;&nbsp; < <i>new message</i> !! >")},setSysMessage:function(e){var t=document.getElementById(this.rootDivName+"_content"),n=document.createElement("div");this.addClass(n,"sodabox_message"),n.innerHTML='<span class="sodabox_systemcontent"> > '+e+"</span>",t.appendChild(n),t.scrollTop=t.scrollHeight},toggleChatBoxGrowth:function(){var e=document.getElementById(this.rootDivName+"_content");e.style.display=="none"?(e.style.display="block",this.isLogined?(document.getElementById(this.rootDivName+"_login").style.display="none",document.getElementById(this.rootDivName+"_input").style.display="block"):(document.getElementById(this.rootDivName+"_login").style.display="block",document.getElementById(this.rootDivName+"_input").style.display="none")):(e.style.display="none",document.getElementById(this.rootDivName+"_login").style.display="none",document.getElementById(this.rootDivName+"_input").style.display="none"),this.setTitleMessage()},setTitleMessage:function(){var e="";document.getElementById(this.rootDivName+"_content").style.display=="block"?e="Online Users : "+(this.cntNotLogined+this.cntLogined)+"&nbsp;&nbsp;&nbsp;( "+this.cntLogined+" Logined )":e="<b>Online Users : "+(this.cntNotLogined+this.cntLogined)+"</b>";var t=document.getElementById(this.rootDivName+"_title");t.innerHTML=e},setTitleSysMessage:function(e){var t=document.getElementById(this.rootDivName+"_title");t.innerHTML=e},logined:function(e){var t=document.getElementById(this.rootDivName+"_login"),n=document.getElementById(this.rootDivName+"_input");document.getElementById(this.rootDivName+"_content").style.display=="block"?(t.style.display="none",n.style.display="block"):(t.style.display="none",n.style.display="none"),this.isLogined=!0,this.setSysMessage('You are just logined. Type "#logout" to logout')},logout:function(){var e=document.getElementById(this.rootDivName+"_login"),t=document.getElementById(this.rootDivName+"_input");document.getElementById(this.rootDivName+"_content").style.display=="block"?(e.style.display="block",t.style.display="none"):(e.style.display="none",t.style.display="none"),this.isLogined=!1},setUserUnfos:function(e,t){var n="";this.cntNotLogined=0,this.cntLogined=0;for(var r=0;r<t.length;r++)n=n+" "+t[r].name,t[r].name=="NONE"?this.cntNotLogined=this.cntNotLogined+1:this.cntLogined=this.cntLogined+1;this.setTitleMessage()},getNowStr:function(){var e=new Date,t=e.getHours(),n=e.getMinutes();n<10&&(n="0"+n);var r=t+":"+n+" ";return t>11?r+="PM":r+="AM",r}},SODABOX=function(e,t,n){var r={},i={},s,o,u=function(e){t.loadJson(r.urlApp+"/user","SODABOX.callbackOAuth&_tryTarget="+e+"&SC="+o+"&CN="+r.channel)},a=function(e){e.isAuth?(i.user=e.user,n.logined(e.user.target),s.emit("join",{UR:i.user,AU:r.authkey,CN:r.channel,MG:"JOIN",r:r.range})):window.open(r.urlApp+"/popupauth?_tryTarget="+e.tryTarget+"&SC="+o+"&CN="+r.channel,"SODABOX_OAUTH","menubar=no,location=no,resizable=yes,scrollbars=yes,status=yes,width=800,height=450")},f=function(){t.loadJson(r.urlApp+"/user","SODABOX.callbackInit")},l=function(e){n.initWin(r.divName,r.urlApp),e.isAuth&&(i.user=e.user,n.logined()),n.setTitleSysMessage("now loading ....."),t.loadScript(r.urlSocket+"/socket.io/socket.io.js",c)},c=function(){n.showRootDiv(!0),n.setTitleSysMessage("connecting to Server....."),s=io.connect(r.urlSocket),s.on("connect",function(){n.setTitleSysMessage("connected");var e;i.user?e=i.user:e={id:"NONE",name:"NONE",link:"NONE"},s.emit("join",{UR:e,AU:r.authkey,CN:r.channel,MG:"JOIN",r:r.range})}),s.on("join",function(e){o=e.socketId,n.setTitleSysMessage("")}),s.on("S_MSG",function(e){e.MG!="IN"&&e.MG!="OUT"&&e.MG=="AUTH"&&(i.user=e._users,n.logined(),s.emit("join",{UR:i.user,AU:r.authkey,CN:r.channel,MG:"JOIN",r:r.range})),n.setUserUnfos(e.UR,e._users)}),s.on("M_MSG",function(e){n.setChatMessage(e.UR,e.MG)}),s.on("extendMessage",function(e){})},h=function(e){t.sendMessage(r.urlApp+"/message?SC="+o+"&r="+r.range+"&MG="+e)},p=function(){t.loadJson(r.urlApp+"/logoutAuth","SODABOX.callbackLogout")},d=function(){n.logout()};return{init:function(t){if(r.isReady)return!1;r.isReady=!0,r.urlApp=e._SODABOX_appurl,r.urlSocket=e._SODABOX_socketurl,r.divName=e._SODABOX_divName,r.channel=e._SODABOX_channel,r.range=e._SODABOX_range,t&&(t.appUrl&&(r.urlApp=t.appUrl),t.socketUrl&&(r.urlSocket=t.socketUrl),t.divName&&(r.divName=t.divName),t.range&&(r.channel=t.channel),t.appUrl&&(r.range=t.range)),f()},callbackInit:function(e){l(e)},tryOAuth:function(e){u(e)},callbackOAuth:function(e){a(e)},sendMessage:function(e){h(e)},callbackSendMessage:function(e){},logout:function(){p()},callbackLogout:function(){d()},getOauthUrl:function(e){return r.urlApp+"/popupauth?_tryTarget="+e+"&SC="+o+"&CN="+r.channel}}}(SODABOX_defaultInfo,SODABOX_utils,SODABOX_window);