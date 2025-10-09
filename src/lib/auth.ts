import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const users = [
  {
    id: "1",
    username: "admin",
    password: "password",
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
  },
  {
    id: "2",
    username: "admin2",
    password: "passport2",
    name: "Dialog Admin",
    email: "admin2@example.com",
    role: "dialog_admin",
  },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" }
      },
      async authorize(credentials) {
        const user = users.find(
          (item) =>
            item.username === credentials?.username &&
            item.password === credentials?.password
        )

        if (!user) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        } as any
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
}