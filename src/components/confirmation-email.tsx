import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Row,
  Column,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

interface ConfirmationEmailProps {
  firstName: string;
  lastName: string;
  date: Date;
  time: string;
  service: string;
  barber: string;
}

export const ConfirmationEmail = ({
  firstName,
  lastName,
  date,
  time,
  service,
  barber,
}: ConfirmationEmailProps) => {
  const previewText = `Your appointment is confirmed for ${date.toLocaleDateString()} at ${time}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl p-4">
            <Section className="mb-4 rounded-lg bg-white p-6 shadow-lg">
              <Heading className="mb-4 text-center text-2xl font-bold">
                Your Appointment is Confirmed!
              </Heading>
              <Text className="mb-4 text-gray-700">
                Dear {firstName} {lastName},
              </Text>
              <Text className="mb-4 text-gray-700">
                We&apos;re excited to confirm your upcoming appointment at our
                barbershop. Here are the details:
              </Text>
              <Section className="mb-4 rounded bg-gray-100 p-4">
                <Row>
                  <Column>
                    <Text className="font-bold">Date:</Text>
                  </Column>
                  <Column>
                    <Text>{date.toLocaleDateString()}</Text>
                  </Column>
                </Row>
                <Row>
                  <Column>
                    <Text className="font-bold">Time:</Text>
                  </Column>
                  <Column>
                    <Text>{time}</Text>
                  </Column>
                </Row>
                <Row>
                  <Column>
                    <Text className="font-bold">Service:</Text>
                  </Column>
                  <Column>
                    <Text>{service}</Text>
                  </Column>
                </Row>
                <Row>
                  <Column>
                    <Text className="font-bold">Barber:</Text>
                  </Column>
                  <Column>
                    <Text>{barber}</Text>
                  </Column>
                </Row>
              </Section>
              <Text className="mb-4 text-gray-700">
                If you need to make any changes or have any questions, please
                don&apos;t hesitate to contact us.
              </Text>
              <Text className="mb-4 text-gray-700">
                We look forward to seeing you soon!
              </Text>
              <Text className="text-gray-700">
                Best regards,
                <br />
                Your Barbershop Team
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ConfirmationEmail;
