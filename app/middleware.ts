export { auth as default } from './auth';

// export const config = {
//   matcher: [
//     //'/((?!api.*)',
//     '/login',
//     '/((?!_next/static|_next/image|favicon.ico).*)',
//   ],
// };

// import { auth } from './auth';
// export default auth(req => {
//   // req.auth
//   const path = req.nextUrl.pathname;

//   // If it's the root path, just render it
//   if (path === '/login') {
//     return NextResponse.next();
//   }

//   const session = await auth(req, res){
//     req,
//     secret: process.env.NEXTAUTH_SECRET,
//   });

//   if (!session) {
//     return NextResponse.redirect(new URL('/login', req.url));
//   } else if (session && (path === '/login' || path === '/register')) {
//     return NextResponse.redirect(new URL('/protected', req.url));
//   }
//   return NextResponse.next();
// })
