import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-background p-6">
      <SignUp />
    </div>
  );
}
