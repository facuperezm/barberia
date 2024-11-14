import {
  Body,
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

interface AppointmentConfirmationEmailProps {
  customerName: string;
  date: string;
  time: string;
  service: string;
  barberName: string;
}

export default function AppointmentConfirmationEmail({
  customerName,
  date,
  time,
  service,
  barberName,
}: AppointmentConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your appointment confirmation at Modern Barbershop</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto px-4 py-8">
            <Heading className="mb-4 text-2xl font-bold text-gray-900">
              Appointment Confirmation
            </Heading>
            <Text className="mb-6 text-gray-700">Dear {customerName},</Text>
            <Text className="mb-4 text-gray-700">
              This email confirms your appointment at Modern Barbershop:
            </Text>
            <Section className="mb-6 rounded-lg bg-gray-50 p-6">
              <Text className="mb-2 text-gray-700">
                <strong>Date:</strong> {date}
              </Text>
              <Text className="mb-2 text-gray-700">
                <strong>Time:</strong> {time}
              </Text>
              <Text className="mb-2 text-gray-700">
                <strong>Service:</strong> {service}
              </Text>
              <Text className="text-gray-700">
                <strong>Barber:</strong> {barberName}
              </Text>
            </Section>
            <Hr className="my-6 border-gray-200" />
            <Text className="text-sm text-gray-700">
              If you need to reschedule or cancel your appointment, please
              contact us at least 24 hours in advance.
            </Text>
            <Text className="text-sm text-gray-700">Phone: (555) 123-4567</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
