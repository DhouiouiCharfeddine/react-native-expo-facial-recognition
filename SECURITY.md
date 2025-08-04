# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of React Native Facial Recognition seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please send an email to [security@example.com](mailto:security@example.com) with the following information:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.
- **Updates**: We will send you regular updates about our progress every 7 days until the issue is resolved.
- **Timeline**: We aim to resolve critical vulnerabilities within 90 days of the initial report.
- **Credit**: If you would like, we will publicly acknowledge your responsible disclosure.

## Security Considerations

### Biometric Data Protection

This application handles sensitive biometric data. We implement the following security measures:

#### Data Storage
- **Local-Only**: All face data is stored locally on the device using AsyncStorage
- **No Cloud Transmission**: Face embeddings never leave the device
- **Mathematical Representation**: We store mathematical embeddings, not actual face images
- **Encryption**: Consider implementing additional encryption for stored embeddings

#### Processing
- **On-Device Only**: All AI processing happens locally using ONNX Runtime
- **Memory Management**: Proper cleanup of tensors and temporary data
- **No Network Requests**: No external API calls for face recognition functionality

#### Permissions
- **Minimal Permissions**: Only requests camera access when needed
- **User Consent**: Clear permission descriptions and usage explanations
- **Graceful Degradation**: App functions properly when permissions are denied

### Recommended Security Practices

When using this application or contributing to it:

#### For Users
1. **Device Security**: Use device lock screen protection (PIN, pattern, biometric)
2. **App Permissions**: Review and understand app permissions before granting
3. **Regular Updates**: Keep the app updated to receive security patches
4. **Physical Security**: Protect your device from unauthorized physical access

#### For Developers
1. **Code Review**: All code changes should be reviewed for security implications
2. **Dependency Updates**: Regularly update dependencies to patch security vulnerabilities
3. **Input Validation**: Validate all user inputs and external data
4. **Error Handling**: Avoid exposing sensitive information in error messages
5. **Secure Coding**: Follow secure coding practices for React Native and TypeScript

### Known Security Considerations

#### Current Limitations
- **Device Compromise**: If the device is compromised, stored face data may be accessible
- **Physical Access**: Face recognition can be bypassed with photos/videos in some cases
- **Model Attacks**: Advanced adversarial attacks against the AI model are theoretically possible

#### Mitigation Strategies
- **Additional Authentication**: Consider combining with PIN/password for critical operations
- **Liveness Detection**: Future versions may include anti-spoofing measures
- **Regular Security Audits**: Periodic security reviews and updates

## Security Updates

Security updates will be released as patch versions and communicated through:

- **GitHub Releases**: All security updates will be documented in release notes
- **Security Advisories**: Critical vulnerabilities will have dedicated advisories
- **Changelog**: Security fixes will be clearly marked in CHANGELOG.md

## Privacy Policy

This application is designed with privacy as a core principle:

### Data Collection
- **No Personal Data Collection**: We do not collect, store, or transmit personal data
- **Local Processing**: All face recognition processing happens on your device
- **No Analytics**: No usage analytics or telemetry data is collected
- **No Third-Party Services**: No external services are used for core functionality

### Data Sharing
- **Zero Data Sharing**: No face data or personal information is shared with third parties
- **Open Source**: All code is open source and auditable
- **Transparent Processing**: All data processing logic is visible in the source code

## Contact

For security-related questions or concerns, please contact:

- **Security Email**: [security@example.com](mailto:security@example.com)
- **General Issues**: [GitHub Issues](https://github.com/maateusx/react-native-facial-recognition/issues)
- **Maintainer**: [@maateusx](https://github.com/maateusx)

---

**Last Updated**: July 30, 2024
