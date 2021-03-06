import React, { useState, useRef } from 'react';
import { useTransition } from 'react-spring';
import { loremIpsum } from 'lorem-ipsum';

import {
  Container,
  Message,
  Content,
  Life,
  Button,
  Main,
} from './messageHubStyles';
import { X } from 'react-feather';

const defaultConfig = {
  tension: 125,
  friction: 20,
  precision: 0.1,
};

type Message = {
  key: number;
  text: string;
};

type MessageHubProps = {
  /**
   * Stores passed
   */
  config?: any;
  timeout?: number;
};

// TODO: DEBUG
// - Animation freezes if message is cancelled while exiting
// - Cancelled message remains in the messages state and re-enters

let id = 0;
const MessageHub = ({
  config = defaultConfig,
  timeout = 2500,
}: MessageHubProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  // store cancel method for each message in garbage-collectable WeakMap
  const cancelMap = useRef(new WeakMap()).current;
  // store vDOM element for each message for getting its offsetHeight value
  const refMap = useRef(new WeakMap()).current;

  const transition = useTransition(messages, {
    key: (message) => message.key,
    from: { opacity: 0, height: 0, life: '100%' },
    // enter thunk's next function allows for sequential animation
    enter: (message) => async (next, cancel) => {
      console.log('enter: ', message.key);
      // map allows us to store cancel method for each message object without directly modifying the object
      cancelMap.set(message, () => {
        console.log('cancel: ', message.key);
        cancel();
        // remove message from messages state after canceling animation
        setMessages((messages: Message[]) =>
          messages.filter((m) => m.key !== message.key)
        );
      });
      await next({
        opacity: 1,
        height: refMap.get(message).offsetHeight,
        config,
      });
      await next({
        life: '0%',
        config: { duration: timeout },
      });
      cancelMap.get(message)();
    },
    leave: (message) => async (next) => {
      console.log('leave: ', message.key);
      await next({ opacity: 0, config });
      await next({ height: 0, config });
    },
  });

  const handleMainClick = () => {
    setMessages([...messages, { key: id++, text: loremIpsum() }]);
  };

  return (
    <Main className="main" onClick={handleMainClick}>
      <p>Click here to create notification</p>
      <Container>
        {/* transition((animatedValues, item, TransitionObject, siblingPosition) => {}) */}
        {transition(({ life, ...style }, message, state) => {
          // Transition still calling cb with cancelled message
          console.log('rendering');
          console.log(messages, message);
          // prevent cancelled message from entering again
          const isMessageRemoved = !messages.find((m) => m.key === message.key);
          // allow 'leave' animation on canceled message
          const isMounting = state.phase === 'mount';
          if (isMessageRemoved && isMounting) {
            console.log(`message ${message.key} is not found in state`);
            return null;
          }
          return (
            <Message style={style as any}>
              {/* React calls ref callback when the component mounts, 
              but by that time the transition Fn will return null so no element will be passed to ref cb 
              and will cause typeError on refMap.get(message).offsetHeight
              */}
              <Content ref={(elm) => elm && refMap.set(message, elm)}>
                <Life style={{ right: life }} />
                <p>{message.text}</p>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (cancelMap.has(message)) {
                      cancelMap.get(message)();
                    }
                  }}
                >
                  <X size={18} />
                </Button>
              </Content>
            </Message>
          );
        })}
      </Container>
    </Main>
  );
};

export default MessageHub;
