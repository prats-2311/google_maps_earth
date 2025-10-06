# Contributing to Global Climate Visualization

We love your input! We want to make contributing to Global Climate Visualization as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with GitHub

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## We Use [GitHub Flow](https://guides.github.com/introduction/flow/index.html)

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issues](https://github.com/your-repo/global-climate-visualization/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-repo/global-climate-visualization/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

People _love_ thorough bug reports. I'm not even kidding.

## Development Environment Setup

1. **Prerequisites**: Ensure you have Node.js (v18.0.0+) and npm (v8.0.0+) installed
2. **Clone the repository**: `git clone <repository-url>`
3. **Install dependencies**: `npm install`
4. **Set up Google Earth Engine**: Follow the authentication steps in README.md
5. **Start development server**: `npm run dev`

## Code Style Guidelines

- Use consistent indentation (2 spaces)
- Follow JavaScript ES6+ standards
- Add comments for complex logic
- Use meaningful variable and function names
- Keep functions small and focused

## Testing

- Test your changes locally before submitting
- Use the test endpoints: `/test`, `/test-fixes`, `/test-global`
- Ensure Earth Engine connection works: `node test-connection.js`
- Verify responsive design on different screen sizes

## Areas We Need Help With

### High Priority

- **Performance Optimization**: Improve data loading and visualization rendering
- **Mobile Experience**: Enhance mobile responsiveness and touch interactions
- **Accessibility**: Add ARIA labels, keyboard navigation, screen reader support
- **Error Handling**: Improve user feedback for API failures and network issues

### Medium Priority

- **Data Sources**: Integration with additional climate datasets
- **Visualization Features**: New chart types, animation improvements
- **User Interface**: Design improvements, better user experience
- **Documentation**: Code comments, user guides, API documentation

### Low Priority

- **Internationalization**: Multi-language support
- **Advanced Analytics**: Statistical analysis features
- **Export Features**: Data download, image export capabilities
- **Social Features**: Sharing, collaboration tools

## Feature Request Process

1. **Check existing issues** to avoid duplicates
2. **Open a new issue** with the "feature request" label
3. **Describe the feature** in detail with use cases
4. **Discuss implementation** with maintainers before starting work
5. **Submit a pull request** following the guidelines above

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

## Getting Help

- **Documentation**: Check README.md and other documentation files
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: Contact maintainers directly for sensitive issues

## Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes for significant contributions
- Special recognition for major features or fixes

Thank you for contributing to Global Climate Visualization! 🌍
