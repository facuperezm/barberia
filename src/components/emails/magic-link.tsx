import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

interface MagicLinkEmailProps {
  url: string;
}

export default function MagicLinkEmail({ url }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your sign-in link for Modern Barbershop</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto px-4 py-8">
            <Section className="overflow-hidden rounded-lg bg-white shadow-lg">
              {/* Header */}
              <Section className="bg-gray-900 px-8 py-12">
                <Heading className="mb-2 text-center text-2xl font-bold text-white">
                  Sign in to your dashboard
                </Heading>
                <Text className="text-center text-gray-300">
                  Use the button below to sign in securely.
                </Text>
              </Section>

              {/* Body */}
              <Section className="px-8 py-12">
                <Text className="mb-6 text-gray-700">
                  Click the button below to sign in to your Modern Barbershop
                  dashboard. This link expires shortly and can only be used once.
                </Text>

                <Section className="mb-8">
                  <Button
                    className="w-full rounded-md bg-gray-900 px-6 py-3 text-center font-medium text-white"
                    href={url}
                  >
                    Sign in
                  </Button>
                </Section>

                <Section className="border-t border-gray-200 pt-6">
                  <Text className="mb-2 text-sm text-gray-600">
                    If the button doesn&apos;t work, copy and paste this URL into
                    your browser:
                  </Text>
                  <Text className="break-all text-sm text-gray-700">{url}</Text>
                  <Text className="mt-4 text-sm text-gray-600">
                    If you didn&apos;t request this email, you can safely ignore
                    it.
                  </Text>
                </Section>
              </Section>

              {/* Footer */}
              <Section className="bg-gray-50 px-8 py-6 text-center">
                <Text className="text-sm text-gray-600">Modern Barbershop</Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
