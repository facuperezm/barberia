import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

interface FeedbackRequestEmailProps {
  customerName: string;
  date: string;
  barberName: string;
  feedbackUrl: string;
}

export default function FeedbackRequestEmail({
  customerName,
  date,
  barberName,
  feedbackUrl,
}: FeedbackRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>How was your experience at Modern Barbershop?</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto px-4 py-8">
            <Heading className="mb-4 text-2xl font-bold text-gray-900">
              How Was Your Visit?
            </Heading>
            <Text className="mb-6 text-gray-700">Hi {customerName},</Text>
            <Text className="mb-4 text-gray-700">
              Thank you for visiting Modern Barbershop on {date}. We hope you
              enjoyed your service with {barberName}.
            </Text>
            <Text className="mb-6 text-gray-700">
              We&apos;d love to hear about your experience. Your feedback helps
              us us improve our services.
            </Text>
            <Section className="mb-8 text-center">
              <Button
                href={feedbackUrl}
                className="rounded-md bg-primary px-6 py-3 font-medium text-white"
              >
                Share Your Feedback
              </Button>
            </Section>
            <Hr className="my-6 border-gray-200" />
            <Text className="text-sm text-gray-700">
              Thank you for choosing Modern Barbershop!
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
