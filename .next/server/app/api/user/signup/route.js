"use strict";(()=>{var e={};e.id=422,e.ids=[422],e.modules={1185:e=>{e.exports=require("mongoose")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},850:(e,r,t)=>{t.r(r),t.d(r,{originalPathname:()=>y,patchFetch:()=>h,requestAsyncStorage:()=>l,routeModule:()=>c,serverHooks:()=>m,staticGenerationAsyncStorage:()=>g});var s={};t.r(s),t.d(s,{POST:()=>d});var n=t(9303),a=t(8716),u=t(670),o=t(7070),i=t(2333),p=t(1732);let d=async e=>{try{await (0,i.q)();let{username:r,phone:t,email:s,password:n}=await e.json();if(await p.Z.findOne({$or:[{username:r},{user_email:s}]}))return new o.NextResponse("User already exists",{status:400});let a=new p.Z({username:r,user_phone:t,user_email:s,user_password:n});return await a.save(),new o.NextResponse(JSON.stringify(a),{status:200})}catch(e){return new o.NextResponse(JSON.stringify(e.message),{status:500})}},c=new n.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/user/signup/route",pathname:"/api/user/signup",filename:"route",bundlePath:"app/api/user/signup/route"},resolvedPagePath:"/Users/toranashitanhung/Documents/CapstoneNIGroup/TymeSavingBackend/app/api/user/signup/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:l,staticGenerationAsyncStorage:g,serverHooks:m}=c,y="/api/user/signup/route";function h(){return(0,u.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:g})}},2333:(e,r,t)=>{t.d(r,{q:()=>u});var s=t(1185),n=t.n(s);let a=!1,u=async()=>{let e=process.env.MONGODB_URI||"";if(n().set("strictQuery",!0),a){console.log("MongoDB already connected");return}try{await n().connect(e,{}),a=!0,console.log("MongoDB connected")}catch(e){console.log(e)}}},1732:(e,r,t)=>{t.d(r,{Z:()=>u});var s=t(1185),n=t.n(s);let a=new s.Schema({username:{type:String,required:!0,unique:!0},user_phone:{type:String,required:!0,unique:!0},user_email:{type:String,required:!0},user_password:{type:String,required:!0},role:{type:String,required:!0,default:"customer"},bankAccounts:{type:[s.Schema.Types.Mixed],default:[]},user_points:{type:[s.Schema.Types.Mixed],default:[]}}),u=n().models.User||n().model("User",a)}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[948,972],()=>t(850));module.exports=s})();