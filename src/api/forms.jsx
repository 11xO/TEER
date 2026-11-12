import { FormProvider, useFormContext, useWatch } from 'react-hook-form';
import { Icon } from '../components/ui.jsx';

export function FieldError({ error, id }) {
  const message = typeof error === 'string' ? error : error?.message;
  return message ? <div className="field-error" id={id} role="alert">{message}</div> : null;
}
export function ApiForm({ form, onSubmit, onInvalid, children, ...props }) {
  return <FormProvider {...form}><form {...props} noValidate onSubmit={form.handleSubmit(onSubmit, onInvalid)}>{children}</form></FormProvider>;
}
export function ApiField({ name, id = name, label, icon, type = 'text', ...props }) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name];
  const Input = type === 'textarea' ? 'textarea' : 'input';
  return <div className="field"><label className="field-label" htmlFor={id}><Icon name={icon} /> {label}</label>
    <Input {...register(name)} {...props} type={type === 'textarea' ? undefined : type} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
    <FieldError id={`${id}-error`} error={error} />
  </div>;
}
export function DynamicFields({ fields }) {
  const { control } = useFormContext();
  const values = useWatch({ control });
  return fields.filter((field) => !field.when || values[field.when.name] === field.when.equals).map(({ when: _when, ...field }) => <ApiField key={field.name} {...field} />);
}
