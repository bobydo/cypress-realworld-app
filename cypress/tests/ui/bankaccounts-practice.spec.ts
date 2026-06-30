describe('template spec', () => {
  it('passes', () => {
    cy.visit('/')
    // Page URL changed.
    cy.url()
      .should('eq', 'http://localhost:3000/')
    // Page title changed. The page title is 'Cypress Real World App'.
    cy.title()
      .should('eq', 'Cypress Real World App')
    // The main heading is 'Sign in'.
    cy.get('#root h1')
      .should('contain.text', 'Sign in')
    // The 'Sign In' button is visible.
    cy.get('[data-test="signin-submit"]')
      .should('contain.text', 'Sign In')
    // A 'Sign Up' link is visible.
    cy.get('[data-test="signup"]')
      .should(($el) => {
        expect($el).to.have.attr('href', '/signup')
        expect($el).to.contain.text('Don\'t have an account? Sign Up')
      })
    
    cy.get('[name="username"]').click();
    cy.get('[name="username"]').type('Shenyi');
    // The username input field has been populated with 'Shenyi'.
    cy.get('[name="username"]')
      .should('have.value', 'Shenyi')
    // The 'Sign In' button is now disabled.
    cy.get('[data-test="signin-submit"]')
      .should(($el) => {
        expect($el).to.have.class('Mui-disabled')
        expect($el).to.have.attr('disabled')
      })
    
    cy.get('[name="password"]').click();
    cy.get('[name="password"]').type('Aust098!!');
    // The 'Sign In' button is now enabled.
    cy.get('[data-test="signin-submit"]')
      .should(($el) => {
        expect($el).to.not.have.class('Mui-disabled')
        expect($el).to.not.have.attr('disabled')
      })
    
    cy.get('[data-test="signin-remember-me"] [name="remember"]').check();
    // The 'Remember Me' checkbox is checked.
    cy.get('[data-test="signin-remember-me"]')
      .should('have.class', 'Mui-checked')
    // The 'remember' input field is checked.
    cy.get('[data-test="signin-remember-me"] [name="remember"]')
      .should(($el) => {
        expect($el).to.have.value('on')
        expect($el).to.be.checked
      })
    
    cy.get('[data-test="signin-submit"]').click();
    // The application body is no longer visible.
    cy.get('body')
      .should('not.be.visible')
    // The application's root element is no longer visible.
    cy.get('#root')
      .should('not.be.visible')
    // The main application container is no longer visible.
    cy.get('#root div.App-root')
      .should('not.be.visible')
    
    cy.get('[data-test="signin-error"] div:nth-child(2)').click();
  })
})