use std::collections::HashSet;

use serde::Deserialize;

use crate::plugin_manifest::is_valid_plugin_id;

const SETTINGS_SCHEMA_SUPPORTED_MAJOR: u64 = 1;
pub(super) const MAX_SETTINGS_SCHEMA_SECTIONS: usize = 24;
const MAX_SETTINGS_FIELDS_PER_SECTION: usize = 64;
const MAX_SETTINGS_FIELDS_TOTAL: usize = 256;
const MAX_SETTINGS_ENUM_OPTIONS: usize = 64;
const MAX_SETTINGS_FIELD_ID_LEN: usize = 120;
const MAX_SETTINGS_FIELD_LABEL_LEN: usize = 80;
const MAX_SETTINGS_SECTION_LABEL_LEN: usize = 80;
const MAX_SETTINGS_TITLE_LEN: usize = 80;
const MAX_SETTINGS_DESCRIPTION_LEN: usize = 280;
const MAX_SETTINGS_PATTERN_LEN: usize = 256;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct PluginSettingsSchema {
    schema_version: String,
    plugin_id: String,
    title: Option<String>,
    description: Option<String>,
    presentation: SettingsPresentation,
    sections: Vec<PluginSettingsSection>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
enum SettingsPresentation {
    Inline,
    Modal,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct PluginSettingsSection {
    id: String,
    label: String,
    description: Option<String>,
    fields: Vec<PluginSettingsField>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
enum PluginSettingsField {
    Boolean(SettingsBooleanField),
    Number(SettingsNumberField),
    Enum(SettingsEnumField),
    String(SettingsStringField),
    Keybinding(SettingsKeybindingField),
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SettingsBooleanField {
    id: String,
    label: String,
    description: Option<String>,
    default: bool,
    #[serde(default, rename = "required")]
    _required: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SettingsNumberField {
    id: String,
    label: String,
    description: Option<String>,
    default: f64,
    min: f64,
    max: f64,
    step: f64,
    #[serde(default, rename = "required")]
    _required: bool,
    ui: Option<SettingsNumberUi>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
enum SettingsNumberUi {
    Slider,
    Input,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SettingsEnumField {
    id: String,
    label: String,
    description: Option<String>,
    default: String,
    options: Vec<SettingsEnumOption>,
    #[serde(default, rename = "required")]
    _required: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SettingsEnumOption {
    value: String,
    label: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SettingsStringField {
    id: String,
    label: String,
    description: Option<String>,
    default: String,
    #[serde(default, rename = "required")]
    _required: bool,
    min_length: Option<i64>,
    max_length: Option<i64>,
    pattern: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SettingsKeybindingField {
    id: String,
    label: String,
    description: Option<String>,
    default: String,
    #[serde(default, rename = "required")]
    _required: bool,
    scope: Option<SettingsKeybindingScope>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
enum SettingsKeybindingScope {
    Global,
    Viewer,
    Plugin,
}

fn is_supported_settings_schema_version(value: &str) -> bool {
    let mut parts = value.split('.');
    let major = parts.next().and_then(|part| part.parse::<u64>().ok());
    let minor = parts.next().and_then(|part| part.parse::<u64>().ok());
    let patch = parts.next().and_then(|part| part.parse::<u64>().ok());
    let extra = parts.next();
    major == Some(SETTINGS_SCHEMA_SUPPORTED_MAJOR)
        && minor.is_some()
        && patch.is_some()
        && extra.is_none()
}

fn is_valid_kebab_identifier(value: &str, min_len: usize, max_len: usize) -> bool {
    if value.len() < min_len || value.len() > max_len {
        return false;
    }
    if value.starts_with('-') || value.ends_with('-') {
        return false;
    }
    value.split('-').all(|part| {
        !part.is_empty()
            && part
                .chars()
                .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit())
    })
}

fn is_valid_settings_field_path(value: &str) -> bool {
    if value.is_empty() || value.len() > MAX_SETTINGS_FIELD_ID_LEN {
        return false;
    }
    value.split('.').all(|segment| {
        !segment.is_empty()
            && segment
                .chars()
                .all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
    })
}

fn is_valid_keybinding_default(value: &str) -> bool {
    if value.is_empty() || value.len() > 24 {
        return false;
    }
    value.chars().all(|ch| {
        ch.is_ascii_alphanumeric()
            || matches!(
                ch,
                '[' | ']' | '-' | '_' | '=' | ',' | '.' | ';' | '\'' | '/' | '`'
            )
    })
}

fn validate_text_max(value: &str, max_len: usize, label: &str) -> Result<(), String> {
    if value.len() > max_len {
        return Err(format!("{label} exceeds max length of {max_len}"));
    }
    Ok(())
}

fn validate_non_empty_text(value: &str, max_len: usize, label: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{label} must not be empty"));
    }
    validate_text_max(value, max_len, label)
}

fn validate_field_common(
    id: &str,
    label: &str,
    description: &Option<String>,
    path: &str,
) -> Result<(), String> {
    if !is_valid_settings_field_path(id) {
        return Err(format!(
            "{path}.id must be a dot-path of [A-Za-z0-9_] segments with max length {MAX_SETTINGS_FIELD_ID_LEN}"
        ));
    }
    validate_non_empty_text(
        label,
        MAX_SETTINGS_FIELD_LABEL_LEN,
        &format!("{path}.label"),
    )?;
    if let Some(value) = description {
        validate_text_max(
            value,
            MAX_SETTINGS_DESCRIPTION_LEN,
            &format!("{path}.description"),
        )?;
    }
    Ok(())
}

pub(super) fn validate_plugin_settings_schema_json(
    schema_json: &str,
    expected_plugin_id: &str,
) -> Result<(), String> {
    let schema: PluginSettingsSchema = serde_json::from_str(schema_json)
        .map_err(|e| format!("invalid settings schema JSON: {e}"))?;

    if !is_supported_settings_schema_version(&schema.schema_version) {
        return Err(format!(
            "schema_version '{}' is unsupported; expected major {}",
            schema.schema_version, SETTINGS_SCHEMA_SUPPORTED_MAJOR
        ));
    }

    if !is_valid_plugin_id(&schema.plugin_id) {
        return Err(format!(
            "plugin_id '{}' is invalid; must be kebab-case (a-z, 0-9, '-'), 3-64 chars",
            schema.plugin_id
        ));
    }
    if schema.plugin_id != expected_plugin_id {
        return Err(format!(
            "schema plugin_id '{}' does not match installed plugin id '{expected_plugin_id}'",
            schema.plugin_id
        ));
    }

    if let Some(title) = &schema.title {
        validate_text_max(title, MAX_SETTINGS_TITLE_LEN, "title")?;
    }
    if let Some(description) = &schema.description {
        validate_text_max(description, MAX_SETTINGS_DESCRIPTION_LEN, "description")?;
    }

    match schema.presentation {
        SettingsPresentation::Inline | SettingsPresentation::Modal => {}
    }

    if schema.sections.is_empty() {
        return Err("sections must contain at least 1 section".to_string());
    }
    if schema.sections.len() > MAX_SETTINGS_SCHEMA_SECTIONS {
        return Err(format!(
            "sections has {} items, maximum is {MAX_SETTINGS_SCHEMA_SECTIONS}",
            schema.sections.len()
        ));
    }

    let mut section_ids: HashSet<&str> = HashSet::new();
    let mut field_ids: HashSet<&str> = HashSet::new();
    let mut total_fields = 0_usize;

    for (section_index, section) in schema.sections.iter().enumerate() {
        let section_path = format!("sections[{section_index}]");

        if !is_valid_kebab_identifier(&section.id, 1, 64) {
            return Err(format!(
                "{section_path}.id '{}' is invalid; expected kebab-case up to 64 chars",
                section.id
            ));
        }
        if !section_ids.insert(section.id.as_str()) {
            return Err(format!("duplicate section id '{}'", section.id));
        }
        validate_non_empty_text(
            &section.label,
            MAX_SETTINGS_SECTION_LABEL_LEN,
            &format!("{section_path}.label"),
        )?;
        if let Some(description) = &section.description {
            validate_text_max(
                description,
                MAX_SETTINGS_DESCRIPTION_LEN,
                &format!("{section_path}.description"),
            )?;
        }

        if section.fields.is_empty() {
            return Err(format!(
                "{section_path}.fields must contain at least 1 field"
            ));
        }
        if section.fields.len() > MAX_SETTINGS_FIELDS_PER_SECTION {
            return Err(format!(
                "{section_path}.fields has {} items, maximum is {MAX_SETTINGS_FIELDS_PER_SECTION}",
                section.fields.len()
            ));
        }

        total_fields += section.fields.len();
        if total_fields > MAX_SETTINGS_FIELDS_TOTAL {
            return Err(format!(
                "schema defines {total_fields} fields, maximum is {MAX_SETTINGS_FIELDS_TOTAL}"
            ));
        }

        for (field_index, field) in section.fields.iter().enumerate() {
            let field_path = format!("{section_path}.fields[{field_index}]");
            match field {
                PluginSettingsField::Boolean(boolean_field) => {
                    validate_field_common(
                        &boolean_field.id,
                        &boolean_field.label,
                        &boolean_field.description,
                        &field_path,
                    )?;
                    let _ = boolean_field.default;
                    if !field_ids.insert(boolean_field.id.as_str()) {
                        return Err(format!("duplicate field id '{}'", boolean_field.id));
                    }
                }
                PluginSettingsField::Number(number_field) => {
                    validate_field_common(
                        &number_field.id,
                        &number_field.label,
                        &number_field.description,
                        &field_path,
                    )?;
                    if number_field.min > number_field.max {
                        return Err(format!(
                            "{field_path}: number field min ({}) must be <= max ({})",
                            number_field.min, number_field.max
                        ));
                    }
                    if number_field.step <= 0.0 {
                        return Err(format!("{field_path}: number field step must be > 0"));
                    }
                    if number_field.default < number_field.min
                        || number_field.default > number_field.max
                    {
                        return Err(format!(
                            "{field_path}: number field default ({}) must be within [{}..={}]",
                            number_field.default, number_field.min, number_field.max
                        ));
                    }
                    if let Some(ui) = &number_field.ui {
                        match ui {
                            SettingsNumberUi::Slider | SettingsNumberUi::Input => {}
                        }
                    }
                    if !field_ids.insert(number_field.id.as_str()) {
                        return Err(format!("duplicate field id '{}'", number_field.id));
                    }
                }
                PluginSettingsField::Enum(enum_field) => {
                    validate_field_common(
                        &enum_field.id,
                        &enum_field.label,
                        &enum_field.description,
                        &field_path,
                    )?;
                    validate_non_empty_text(
                        &enum_field.default,
                        MAX_SETTINGS_FIELD_LABEL_LEN,
                        &format!("{field_path}.default"),
                    )?;
                    if enum_field.options.is_empty() {
                        return Err(format!(
                            "{field_path}.options must contain at least 1 option"
                        ));
                    }
                    if enum_field.options.len() > MAX_SETTINGS_ENUM_OPTIONS {
                        return Err(format!(
                            "{field_path}.options has {} items, maximum is {MAX_SETTINGS_ENUM_OPTIONS}",
                            enum_field.options.len()
                        ));
                    }
                    let mut option_values: HashSet<&str> = HashSet::new();
                    for (option_index, option) in enum_field.options.iter().enumerate() {
                        validate_non_empty_text(
                            &option.value,
                            MAX_SETTINGS_FIELD_LABEL_LEN,
                            &format!("{field_path}.options[{option_index}].value"),
                        )?;
                        validate_non_empty_text(
                            &option.label,
                            MAX_SETTINGS_FIELD_LABEL_LEN,
                            &format!("{field_path}.options[{option_index}].label"),
                        )?;
                        if !option_values.insert(option.value.as_str()) {
                            return Err(format!(
                                "{field_path}: duplicate enum option value '{}'",
                                option.value
                            ));
                        }
                    }
                    if !option_values.contains(enum_field.default.as_str()) {
                        return Err(format!(
                            "{field_path}.default '{}' is not present in options",
                            enum_field.default
                        ));
                    }
                    if !field_ids.insert(enum_field.id.as_str()) {
                        return Err(format!("duplicate field id '{}'", enum_field.id));
                    }
                }
                PluginSettingsField::String(string_field) => {
                    validate_field_common(
                        &string_field.id,
                        &string_field.label,
                        &string_field.description,
                        &field_path,
                    )?;
                    if let Some(min_length) = string_field.min_length {
                        if min_length < 0 {
                            return Err(format!("{field_path}.min_length must be >= 0"));
                        }
                    }
                    if let Some(max_length) = string_field.max_length {
                        if max_length < 1 {
                            return Err(format!("{field_path}.max_length must be >= 1"));
                        }
                    }
                    if let (Some(min_length), Some(max_length)) =
                        (string_field.min_length, string_field.max_length)
                    {
                        if min_length > max_length {
                            return Err(format!(
                                "{field_path}: min_length ({min_length}) must be <= max_length ({max_length})"
                            ));
                        }
                    }
                    if let Some(pattern) = &string_field.pattern {
                        validate_text_max(
                            pattern,
                            MAX_SETTINGS_PATTERN_LEN,
                            &format!("{field_path}.pattern"),
                        )?;
                        return Err(format!(
                            "{field_path}.pattern is not supported in host 1.0; regex validation is disabled for safety"
                        ));
                    }
                    if let Some(max_length) = string_field.max_length {
                        if string_field.default.len() > max_length as usize {
                            return Err(format!(
                                "{field_path}: default string length exceeds max_length ({max_length})"
                            ));
                        }
                    }
                    if let Some(min_length) = string_field.min_length {
                        if string_field.default.len() < min_length as usize {
                            return Err(format!(
                                "{field_path}: default string length is below min_length ({min_length})"
                            ));
                        }
                    }
                    if !field_ids.insert(string_field.id.as_str()) {
                        return Err(format!("duplicate field id '{}'", string_field.id));
                    }
                }
                PluginSettingsField::Keybinding(keybinding_field) => {
                    validate_field_common(
                        &keybinding_field.id,
                        &keybinding_field.label,
                        &keybinding_field.description,
                        &field_path,
                    )?;
                    if !is_valid_keybinding_default(&keybinding_field.default) {
                        return Err(format!(
                            "{field_path}.default is invalid; expected 1-24 chars matching [A-Za-z0-9[]-_=,.;'/`]"
                        ));
                    }
                    if let Some(scope) = &keybinding_field.scope {
                        match scope {
                            SettingsKeybindingScope::Global
                            | SettingsKeybindingScope::Viewer
                            | SettingsKeybindingScope::Plugin => {}
                        }
                    }
                    if !field_ids.insert(keybinding_field.id.as_str()) {
                        return Err(format!("duplicate field id '{}'", keybinding_field.id));
                    }
                }
            }
        }
    }

    Ok(())
}
