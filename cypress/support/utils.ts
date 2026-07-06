import { faker } from "@faker-js/faker";

export const isMobile = () => {
  return Cypress.config("viewportWidth") < Cypress.expose("mobileViewportWidthBreakpoint");
};

export const getFakeAmount = () => parseInt(faker.finance.amount(), 10);

export const formatDate = (date: Date) => date.toISOString().split("T")[0];

export const generateUser = () => ({
  firstName: faker.person.firstName(),
  lastName:  faker.person.lastName(),
  username:  faker.internet.username().toLowerCase(),
  password:  faker.internet.password({ length: 12 }),
  email:     faker.internet.email(),
});

export const cyreal = { isMobile, getFakeAmount, formatDate, generateUser };
