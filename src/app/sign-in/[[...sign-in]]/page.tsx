import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-background p-6">
      <SignIn />
    </div>
  );
}
