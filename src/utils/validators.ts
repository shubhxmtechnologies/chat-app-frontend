/**
 * Client-side validation helpers matching backend schema constraints
 */

export interface ValidationResult<T> {
    isValid: boolean;
    errors: Partial<Record<keyof T, string>>;
}

/**
 * Validates Email:
 * - Trimmed length between 13 and 30 characters
 * - Valid email format
 */
export const validateEmail = (email: string): string | null => {
    const trimmed = email.trim();
    if (!trimmed) {
        return "Email is required";
    }
    if (trimmed.length < 13 || trimmed.length > 30) {
        return "Email must be between 13 and 30 characters";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
        return "Please enter a valid email address";
    }
    return null;
};

/**
 * Validates Password:
 * - Length between 8 and 16 characters
 */
export const validatePassword = (
    password: string,
    fieldName = "Password"
): string | null => {
    if (!password) {
        return `${fieldName} is required`;
    }
    if (password.length < 8 || password.length > 16) {
        return `${fieldName} must be between 8 and 16 characters`;
    }
    return null;
};

/**
 * Validates Username:
 * - Trimmed length between 5 and 14 characters
 * - Letters, numbers, and underscores only
 */
export const validateUsername = (username: string): string | null => {
    const trimmed = username.trim();
    if (!trimmed) {
        return "Username is required";
    }
    if (trimmed.length < 5 || trimmed.length > 14) {
        return "Username must be between 5 and 14 characters";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return "Username can only contain letters, numbers, and underscores";
    }
    return null;
};

/**
 * Validates First Name:
 * - Required, length between 1 and 50 characters
 */
export const validateFirstName = (firstName: string): string | null => {
    const trimmed = firstName.trim();
    if (!trimmed) {
        return "First name is required";
    }
    if (trimmed.length > 50) {
        return "First name cannot exceed 50 characters";
    }
    return null;
};

/**
 * Validates Last Name:
 * - Optional, max 50 characters
 */
export const validateLastName = (lastName?: string | null): string | null => {
    if (!lastName) return null;
    const trimmed = lastName.trim();
    if (trimmed.length > 50) {
        return "Last name cannot exceed 50 characters";
    }
    return null;
};

/**
 * Validates Bio:
 * - Optional, max 200 characters
 */
export const validateBio = (bio?: string | null): string | null => {
    if (!bio) return null;
    const trimmed = bio.trim();
    if (trimmed.length > 200) {
        return "Bio cannot exceed 200 characters";
    }
    return null;
};

/* =========================================================================
   Composite Form Validators
   ========================================================================= */

export interface LoginFormData {
    email: string;
    password: string;
}

export const validateLoginForm = (
    data: LoginFormData
): ValidationResult<LoginFormData> => {
    const errors: Partial<Record<keyof LoginFormData, string>> = {};

    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(data.password);
    if (passwordError) errors.password = passwordError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};

export interface RegisterFormData {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    bio?: string;
}

export const validateRegisterForm = (
    data: RegisterFormData
): ValidationResult<RegisterFormData> => {
    const errors: Partial<Record<keyof RegisterFormData, string>> = {};

    const usernameError = validateUsername(data.username);
    if (usernameError) errors.username = usernameError;

    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(data.password);
    if (passwordError) errors.password = passwordError;

    const firstNameError = validateFirstName(data.firstName);
    if (firstNameError) errors.firstName = firstNameError;

    const lastNameError = validateLastName(data.lastName);
    if (lastNameError) errors.lastName = lastNameError;

    const bioError = validateBio(data.bio);
    if (bioError) errors.bio = bioError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};

export interface UpdateNameFormData {
    firstName: string;
    lastName?: string;
}

export const validateUpdateNameForm = (
    data: UpdateNameFormData
): ValidationResult<UpdateNameFormData> => {
    const errors: Partial<Record<keyof UpdateNameFormData, string>> = {};

    const firstNameError = validateFirstName(data.firstName);
    if (firstNameError) errors.firstName = firstNameError;

    const lastNameError = validateLastName(data.lastName);
    if (lastNameError) errors.lastName = lastNameError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};

export interface UpdateEmailFormData {
    email: string;
}

export const validateUpdateEmailForm = (
    data: UpdateEmailFormData
): ValidationResult<UpdateEmailFormData> => {
    const errors: Partial<Record<keyof UpdateEmailFormData, string>> = {};

    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};

export interface ChangePasswordFormData {
    currentPassword: string;
    newPassword: string;
}

export const validateChangePasswordForm = (
    data: ChangePasswordFormData
): ValidationResult<ChangePasswordFormData> => {
    const errors: Partial<Record<keyof ChangePasswordFormData, string>> = {};

    const currentPasswordError = validatePassword(
        data.currentPassword,
        "Current password"
    );
    if (currentPasswordError) errors.currentPassword = currentPasswordError;

    const newPasswordError = validatePassword(data.newPassword, "New password");
    if (newPasswordError) errors.newPassword = newPasswordError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};
