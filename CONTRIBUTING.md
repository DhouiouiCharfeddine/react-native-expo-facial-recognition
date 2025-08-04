# Contributing to React Native Facial Recognition

Thank you for your interest in contributing to this project! We welcome contributions from everyone.

## 🤝 Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Use welcoming and inclusive language
- Be collaborative and constructive
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git
- Expo CLI
- iOS Simulator or Android Emulator

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/react-native-facial-recognition.git
   cd react-native-facial-recognition
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Start development server**
   ```bash
   npm start
   ```

## 📝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, device, React Native version)
- **Error logs** if available

### Suggesting Enhancements

Enhancement suggestions are welcome! Include:

- **Clear title and description**
- **Use case and motivation**
- **Proposed implementation** (if you have ideas)
- **Potential impact** on existing functionality

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** if you've added code that should be tested
4. **Update documentation** if you've changed APIs
5. **Ensure tests pass** and code follows style guidelines
6. **Create a pull request** with a clear title and description

#### Pull Request Guidelines

- **One feature per PR** - keep changes focused
- **Clear commit messages** - use conventional commits format
- **Update documentation** - keep README.md and comments current
- **Add tests** - maintain or improve test coverage
- **Follow code style** - use ESLint and Prettier

## 🏗️ Development Guidelines

### Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Type checking
npm run type-check
```

### Commit Message Format

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(face-detection): add confidence threshold configuration
fix(storage): resolve AsyncStorage race condition
docs(readme): update installation instructions
```

### Project Structure

```
src/
├── screens/          # React Native screens
├── services/         # Business logic and services
├── components/       # Reusable UI components
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
└── __tests__/        # Test files
```

### Testing

- Write unit tests for utility functions
- Add integration tests for services
- Test UI components with React Native Testing Library
- Ensure camera functionality works on real devices

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## 🎯 Areas for Contribution

### High Priority

- **Performance optimizations** - face detection and model inference
- **Additional AI models** - support for other face recognition models
- **Testing** - improve test coverage
- **Documentation** - API documentation and tutorials
- **Accessibility** - screen reader support and accessibility features

### Medium Priority

- **Face database management** - import/export functionality
- **Batch operations** - register multiple faces at once
- **Advanced settings** - configurable thresholds and parameters
- **Analytics** - usage statistics and performance metrics

### Good First Issues

- **UI improvements** - animations and visual enhancements
- **Error messages** - better user feedback
- **Code cleanup** - refactoring and optimization
- **Documentation** - README improvements and code comments

## 🔧 Technical Considerations

### Face Recognition

- Understand ArcFace model requirements (112x112 input, CHW format)
- Consider privacy implications of biometric data
- Test on multiple devices and lighting conditions
- Optimize for mobile performance constraints

### React Native

- Follow React Native best practices
- Use TypeScript for type safety
- Implement proper error boundaries
- Consider iOS and Android platform differences

### Performance

- Profile memory usage during face processing
- Optimize tensor operations and cleanup
- Consider background processing for heavy operations
- Test on lower-end devices

## 📋 Review Process

1. **Automated checks** must pass (linting, type checking, tests)
2. **Manual review** by maintainers
3. **Testing** on different devices/platforms
4. **Documentation** review if applicable
5. **Merge** after approval

### Review Criteria

- Code quality and readability
- Test coverage and quality
- Performance impact
- Security considerations
- Breaking change assessment
- Documentation completeness

## 🆘 Getting Help

- **GitHub Issues** - for bug reports and feature requests
- **GitHub Discussions** - for questions and general discussion
- **Pull Request comments** - for code-specific questions

## 📚 Resources

### Learning Materials

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [ONNX Runtime Documentation](https://onnxruntime.ai/docs/)
- [ArcFace Paper](https://arxiv.org/abs/1801.07698)

### Development Tools

- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/) - Mobile app debugger
- [Metro Bundler](https://metrobundler.dev/) - React Native bundler

## 🎉 Recognition

Contributors will be:

- Added to the contributors list in README.md
- Mentioned in release notes for significant contributions
- Invited to become maintainers for exceptional ongoing contributions

Thank you for contributing to React Native Facial Recognition! 🙏
