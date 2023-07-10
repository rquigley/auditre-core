import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
export const config = {
  matcher: [
    "/login",
    "/((?!api|_next/static|_next/image|_next/chunks|_next/image|favicon.ico).*)",
  ],
};

export default async function middleware(req: NextRequest) {
  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const path = req.nextUrl.pathname;
  console.log(session, path);
  if (!session && path !== "/login" && path !== "/register") {
    console.log("here1");
    return NextResponse.redirect(new URL("/login", req.url));
  } else if (session && (path === "/login" || path === "/register")) {
    console.log("here2");
    return NextResponse.redirect(new URL("/protected", req.url));
  }
  console.log("here3");
  return NextResponse.next();
}
