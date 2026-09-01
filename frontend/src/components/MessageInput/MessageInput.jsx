import { useState } from 'react';

const MessageInput = ({ onSend, disabled = false, maxLength = 1000 }) => {
  const [value, setValue] = useState('');

  const submit = async (event) => {
    event.preventDefault();

    const trimmed = value.trim();

    if (!trimmed || disabled) {
      return;
    }

    await onSend(trimmed);
    setValue('');
  };

  return (
    <form className="message-input" onSubmit={submit}>
      <textarea
        rows="2"
        value={value}
        maxLength={maxLength}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type your message..."
        disabled={disabled}
      />
      <button type="submit" className="btn" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  );
};

export default MessageInput;
