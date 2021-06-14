import { NlVaccineAdministeredRateMovingAverageValue } from '@corona-dashboard/common';
import css from '@styled-system/css';
import { shuffle } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { Box } from '~/components/base';
import { InlineText, Text } from '~/components/typography';
import { useIntl } from '~/intl';
import { colors } from '~/style/theme';
import { replaceComponentsInText } from '~/utils/replace-components-in-text';
import { useIsMountedRef } from '~/utils/use-is-mounted-ref';

const RADIUS = 60;
const CONTAINER_WIDTH = RADIUS * 2 + 12;
const CONTAINER_HEIGHT = RADIUS * 2 + 12;

const MINUTE_IN_SECONDS = 60;
const FRAMES_PER_MINUTE = 25;

interface VaccineTickerProps {
  data: NlVaccineAdministeredRateMovingAverageValue;
}

export function VaccineTicker({ data }: VaccineTickerProps) {
  const { siteText, formatNumber } = useIntl();

  const dosesPerMinute = Math.round(data.doses_per_minute);

  const isMountedRef = useIsMountedRef();
  const [animationProgress, setAnimationProgress] = useState(0);
  const [shapeIndex, setShapeIndex] = useState(0);
  const timerOffsetRef = useRef(new Date().getSeconds());

  useEffect(() => {
    let timeoutId: number;
    function animate() {
      if (!isMountedRef.current) return;

      const now = new Date();

      const seconds =
        (now.getSeconds() +
          MINUTE_IN_SECONDS -
          timerOffsetRef.current +
          now.getMilliseconds() / 1000) %
        MINUTE_IN_SECONDS;

      /**
       * Reset at the first frame of the new clock cycle.
       * It uses a multiplier 1.5 to be sure to actually capture the first frame.
       */
      if (Math.ceil(seconds - (FRAMES_PER_MINUTE * 1.5) / 1000) === 0) {
        setShapeIndex((x) => x + 1);
      }

      setAnimationProgress(seconds / MINUTE_IN_SECONDS);

      timeoutId = window.setTimeout(animate, 1000 / FRAMES_PER_MINUTE);
    }
    animate();
    return () => window.clearTimeout(timeoutId);
  }, [isMountedRef]);

  return (
    <Box
      display="flex"
      alignItems="center"
      flexDirection={{ _: 'column', xs: 'row' }}
      borderTop="1px solid"
      borderTopColor="border"
      pt={{ _: 3, md: 4 }}
    >
      <div css={css({ my: 2 })}>
        <Box
          width={CONTAINER_WIDTH}
          height={CONTAINER_HEIGHT}
          position="relative"
        >
          <Clock progress={animationProgress} />

          <Counter
            progress={animationProgress}
            dosesPerMinute={dosesPerMinute}
          />
        </Box>
      </div>

      <Box my={2} pl={{ xs: 3, md: 4 }}>
        <Text fontSize="1.625rem" m={0}>
          <Shapes index={shapeIndex} />
          {replaceComponentsInText(
            siteText.vaccinaties.clock.title_doses_per_minute,
            {
              dosesPerMinute: (
                <InlineText color={colors.data.primary} fontWeight="bold">
                  {formatNumber(dosesPerMinute)}
                </InlineText>
              ),
            }
          )}
        </Text>
        <Text m={0}>
          {replaceComponentsInText(siteText.vaccinaties.clock.description, {
            amount: (
              <InlineText color={colors.data.primary} fontWeight="bold">
                {formatNumber(data.doses_per_day)}
              </InlineText>
            ),
          })}
        </Text>
      </Box>
    </Box>
  );
}

interface ClockProps {
  progress: number;
}
function Clock({ progress }: ClockProps) {
  return (
    <div
      css={css({
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: CONTAINER_WIDTH,
        borderRadius: '50%',
        overflow: 'hidden',
      })}
    >
      {Array(60)
        .fill(null)
        .map((_, index) => (
          <Mark
            index={index}
            key={index}
            isActive={index < progress * MINUTE_IN_SECONDS}
          />
        ))}
    </div>
  );
}

interface MarkProps {
  index: number;
  isActive: boolean;
}
function Mark({ index, isActive }: MarkProps) {
  const angle = ((index / MINUTE_IN_SECONDS) * 2 - 1) * Math.PI;

  /**
   * The hour mark is positioned more to the middle and has a different 'height'
   */
  const isHourMark = index % 5 === 0;

  return (
    <div
      style={{
        position: 'absolute',
        transform: `
          translate(-50%, -50%)
          rotate(${angle}rad)
          translateY(${CONTAINER_WIDTH / 2 - (isHourMark ? 10 : 5)}px)
        `,
        height: isHourMark ? 20 : 10,
        width: isHourMark ? 6 : 8,
        top: '50%',
        left: '50%',
        backgroundColor: isActive ? colors.data.primary : '#e7e7e7',
        transitionProperty: 'background-color',
        transitionDuration: isActive ? '0ms' : '400ms',
        transitionDelay: isActive ? '0ms' : `${index * 15}ms`,
        zIndex: isActive ? 5 : 4,
      }}
    />
  );
}

interface CounterProps {
  progress: number;
  dosesPerMinute: number;
}
function Counter({ progress, dosesPerMinute }: CounterProps) {
  /**
   * Pause the counter animation for the last `pausePercentage` of the cycle.
   */
  const pausePercentage = 3;
  const displayMax = 1 - pausePercentage / 100;

  const currentCount = Math.round(
    Math.min(progress / displayMax, 1) * dosesPerMinute
  );

  return (
    <Box
      position="absolute"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
    >
      <Text fontSize={4} fontWeight="bold" color="data.primary" m={0}>
        {currentCount}
      </Text>
    </Box>
  );
}

function Shapes({ index }: { index: number }) {
  const shapes = useShapes();
  const currentShapeIndex = index % shapes.length;

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 40 40"
      style={{ verticalAlign: 'middle', marginRight: 5, paddingBottom: 5 }}
    >
      {shapes.map((path, index) => (
        <path
          key={index}
          d={path}
          fill={colors.body}
          style={{
            opacity: currentShapeIndex === index ? 1 : 0,
            transitionProperty: 'opacity',
            transitionDuration: `300ms`,
          }}
        />
      ))}
    </svg>
  );
}

function useShapes() {
  /**
   * Shapes is initially an empty array to prevent a server-side rendered
   * particular shape. On mount we'll populate the array with a randomized order.
   */
  const [shapes, setShapes] = useState<string[]>([]);

  useEffect(
    () =>
      setShapes(
        shuffle([
          // id: 1
          'M32.2993 28.5152C30.8594 27 27.7394 25.7273 25.7595 25.0606C26.4195 24.2727 26.8395 23.1818 27.0195 21.8485C27.7394 21.303 28.3394 20.1515 28.3994 17.8485C28.3994 16.9394 28.2194 15.8485 27.5594 15.1212C28.0394 13.7879 27.7994 11.6667 26.6595 9.84849C26.1795 9.06061 25.4595 8.21212 24.2595 7.54545C24.3795 7.24242 24.4395 6.87879 24.4395 6.51515C24.4395 4.57576 22.4596 3 19.9996 3C17.5397 3 15.5597 4.51515 15.5597 6.51515C15.5597 6.87879 15.6197 7.24242 15.7397 7.54545C14.4798 8.15152 13.8198 9.06061 13.3398 9.84849C12.1998 11.6667 11.9598 13.7879 12.4398 15.1212C11.7798 15.8485 11.5998 16.9394 11.5998 17.8485C11.6598 20.1515 12.2598 21.303 12.9798 21.8485C13.1598 23.1212 13.6398 24.2121 14.2398 25C12.3198 25.6667 9.1999 26.8788 7.75993 28.5152C5 31.5455 5 37 5 37H34.9993C34.9993 37 35.1193 31.4242 32.2993 28.5152ZM24.1395 17H15.9197L14.9598 15.6667C17.1797 15.1212 19.0397 13.6061 19.9996 12.7576C20.9596 13.6667 22.8196 15.1818 25.0395 15.6667L24.1395 17ZM24.1995 17.9091C24.0795 18.8182 23.5995 19.3636 22.8196 19.3636C22.0396 19.3636 21.5596 18.8788 21.4396 17.9091H24.1995ZM18.5597 17.9091C18.4397 18.8788 18.0197 19.3636 17.1797 19.3636C16.3997 19.3636 15.9197 18.8182 15.7997 17.9091H18.5597ZM19.9996 32.4545C18.9797 31.9697 15.7397 30.2727 14.0598 27C14.5998 26.8182 15.3797 26.6364 15.9797 26.0909C16.3397 25.7879 16.6997 25.303 16.8797 24.6364C15.4997 24.4545 14.6598 22.5758 14.6598 20.2727C14.5398 20.3939 14.3598 20.4545 14.2998 20.4545C13.6998 20.4545 13.4598 19.0606 13.4598 17.8485C13.4598 17.0606 13.6998 16.4545 13.9398 16.2727L14.9598 17.7273C15.0198 19.6061 16.1597 20.2727 17.2397 20.2727C18.5597 20.2727 19.3396 19.4242 19.5196 17.9091H20.5996C20.7196 19.3636 21.5596 20.2727 22.8796 20.2727C23.9595 20.2727 25.0395 19.6061 25.1595 17.7273L26.1795 16.3333C26.4195 16.4545 26.6595 17.1212 26.6595 17.8485C26.5995 19.0606 26.3595 20.4545 25.8195 20.4545C25.6995 20.4545 25.5795 20.3939 25.4595 20.2727C25.4595 22.697 24.5595 24.6364 23.0596 24.697C22.1596 25.8485 21.3196 26.0909 19.9996 26.0909C19.2796 26.0909 18.7397 26.0303 18.2597 25.7879C18.6197 26.3333 19.2796 27.0606 20.4196 27.3636C21.8596 27.7273 23.1196 27.303 23.9595 26.3939C24.5595 26.5758 25.2195 26.8182 25.9395 27.0606C24.2595 30.2727 21.0196 31.9697 19.9996 32.4545Z',

          // id: 2
          'M27.02 21.6939C26.84 22.9184 26.48 23.898 25.94 24.6939C27.8 25.3061 31.16 26.5306 32.36 27.8775C34.1 29.7755 35 37 35 37H5C5 37 5.9 29.7755 7.7 27.8163C8.9 26.4694 12.26 25.2449 14.12 24.6327C13.58 23.8367 13.22 22.8571 13.04 21.6327C11.72 20.6531 11.6 17.898 11.72 16.8571C11.24 16.3061 10.64 15.1429 11.48 12.6939C11.9 11.4082 12.74 10.1224 14.06 10C15.38 8.04082 17.78 7 20 7C22.16 7 24.56 7.97959 26 10.0612C27.32 10.1837 28.16 11.4694 28.58 12.7551C29.36 15.1429 28.82 16.3673 28.34 16.9184C28.52 18.0816 28.28 20.7143 27.02 21.6939ZM15.74 10.7347C15.86 12.1429 15.8 13.551 15.2 15.0816V16.3061H15.98C16.34 15.8776 16.88 15.5714 17.48 15.5714C18.08 15.5714 18.62 15.8163 18.98 16.2449C19.28 16.0612 19.64 15.9388 20 15.9388C20.36 15.9388 20.72 16.0612 21.02 16.2449C21.38 15.8776 21.92 15.5714 22.52 15.5714C23.12 15.5714 23.66 15.8776 24.02 16.3061H24.8V15.0816C24.2 13.551 24.08 12.1429 24.26 10.7347C23.18 9.38776 21.44 8.77551 20 8.77551C18.56 8.77551 16.82 9.38776 15.74 10.7347ZM22.46 18.6939C23.12 18.6939 23.6 18.2041 23.6 17.5918C23.6 16.9796 23.12 16.4898 22.46 16.4898C21.8 16.4898 21.32 16.9796 21.32 17.5918C21.32 18.2041 21.86 18.6939 22.46 18.6939ZM17.48 18.6939C18.14 18.6939 18.62 18.2041 18.62 17.5918C18.62 16.9796 18.08 16.4898 17.48 16.4898C16.82 16.4898 16.34 16.9796 16.34 17.5918C16.34 18.2041 16.88 18.6939 17.48 18.6939ZM24.74 23.2245C25.1 22.4286 25.34 21.3265 25.34 20.102C25.46 20.2245 25.7 20.2857 25.88 20.2245C26.42 20.2245 26.66 18.8163 26.72 17.5918C26.72 16.7959 26.48 16.1224 26.24 16C26.06 15.9388 25.82 16 25.64 16.0612C25.6086 16.2533 25.5608 16.4287 25.5224 16.5698C25.4873 16.6985 25.46 16.7987 25.46 16.8571C25.46 17.0408 25.34 17.2245 25.16 17.2857L24.56 17.5918C24.5 18.6327 23.66 19.4898 22.58 19.4898C21.5 19.4898 20.6 18.6327 20.6 17.5306C20.6 17.3469 20.6 17.2245 20.66 17.0408C20.3 16.7959 19.82 16.7959 19.46 17.0408C19.52 17.2245 19.52 17.3469 19.52 17.5306C19.52 18.5714 18.62 19.4898 17.54 19.4898C16.46 19.4898 15.62 18.6327 15.56 17.5918L14.96 17.2857C14.78 17.1633 14.72 17.0408 14.66 16.8571C14.66 16.8359 14.6456 16.7853 14.6243 16.7104C14.584 16.5691 14.5192 16.3413 14.48 16.0612C14.3 15.9388 14.06 15.8776 13.88 16C13.64 16.1837 13.4 16.7959 13.4 17.5918C13.4 18.8163 13.64 20.2245 14.24 20.2245C14.36 20.2245 14.6 20.1633 14.72 20.0408C14.72 21.3265 14.96 22.4898 15.38 23.2857C15.68 23.898 16.22 24.3878 16.88 24.5102C16.64 25.6735 16.58 26.4082 16.58 26.7143C16.58 28.8571 19.1 30.5102 20.06 31.0612C21.02 30.5102 23.54 28.8571 23.54 26.7143C22.04 27.9388 19.34 27.3265 18.32 25.7959C18.8 26.0408 19.4 26.102 20.06 26.102C21.32 26.102 22.22 25.7347 23 24.5714C23.78 24.5102 24.38 23.9592 24.74 23.2245Z M18.7998 21.2677C19.4598 21.1452 19.9998 21.8799 19.9998 21.8799C19.9998 21.8799 20.5398 21.1452 21.1998 21.2677C21.4967 21.3182 21.7425 21.5351 22.0215 21.7813C22.4191 22.1323 22.884 22.5426 23.6598 22.6146C23.6598 22.6146 21.4998 23.9003 19.9998 22.9207C18.4998 23.9003 16.3398 22.6146 16.3398 22.6146C17.1332 22.541 17.6232 22.1135 18.0311 21.7575C18.3019 21.5213 18.5365 21.3165 18.7998 21.2677Z',

          // id: 3
          'M32.3677 28.057C31.0576 26.6307 27.2905 25.3622 25.5361 24.8296C25.4431 24.1596 25.3192 23.3837 25.2081 22.7373C26.2813 21.4359 26.9406 20.0917 27.1578 18.715C27.9547 17.9826 28.3986 16.8136 28.3986 15.3781C28.3986 14.9309 28.3993 13.755 27.6625 12.9537C27.8447 10.9489 27.9715 7.84631 27.1903 6.59485C26.2288 5.05431 25.0605 4.30293 22.8324 4.8065C21.3711 4.11115 20.3762 3.67594 17.8159 4.30209C16.037 4.737 14.0899 5.4473 13.0639 6.63239C12.0727 7.77754 12.1403 10.9711 12.2995 13.0023C11.6041 13.8023 11.6014 14.9396 11.6014 15.3781C11.6014 16.8112 12.0439 17.9788 12.8383 18.7114C13.0674 20.2201 13.8061 21.6629 15.0646 23.0731C15.001 23.5578 14.9276 24.1241 14.8528 24.7136C13.345 25.1547 9.04994 26.5136 7.63232 28.057C5.90822 29.9333 5 37 5 37H20H35C35 37 34.0918 29.9333 32.3677 28.057ZM22.231 23.0078C21.7626 23.4069 20.881 23.6725 19.9997 23.6718C19.362 23.6713 18.7244 23.4997 18.2434 23.2905C18.6117 23.8493 19.2366 24.5364 20.3943 24.8431C22.2872 25.3446 23.67 24.2942 23.67 24.2942C23.67 24.2942 23.8397 25.4434 23.8347 25.7451C24.0307 27.8403 21.7006 30.1399 20.2285 31.1979C18.8484 30.1468 16.2734 27.8763 16.5333 25.7788C16.6755 24.6299 16.5577 25.4489 17.0274 22.5131C15.6613 21.1918 14.5648 19.5902 14.5648 17.6715C13.5942 17.3688 13.34 16.1427 13.34 15.3781C13.34 14.6138 13.533 14.2003 13.8043 14.0722C14.0395 13.9614 14.2678 14.0436 14.4121 14.1254C14.4969 14.5174 14.5611 14.8091 14.586 14.9121C14.7096 15.4233 15.2 15.3763 15.2 15.3763V11.3251C16.4439 11.2347 18.9162 10.8727 21.6499 9.45941L24.8 11.5773V15.3763C24.8 15.3763 25.2904 15.4233 25.414 14.9121C25.4389 14.8091 25.5031 14.5174 25.5879 14.1254C25.7322 14.0436 25.9605 13.9614 26.1957 14.0722C26.467 14.2003 26.66 14.6138 26.66 15.3781C26.66 16.1427 26.4058 17.3688 25.4352 17.6715C25.4352 19.8954 23.9151 21.5731 22.231 23.0078Z',

          // id: 4
          'M32.3679 28.5021C30.8304 26.9123 26.6186 25.9357 25.4806 25.0346C25.4203 24.5096 25.3317 23.8669 25.24 23.2471C27.0031 23.4313 28.5017 23.6429 29.5669 24.013C29.8013 24.0945 30.0488 23.9394 30.1138 23.6803C30.8999 20.5346 31.2437 18.4141 31.2437 16.1103C31.2437 11.4821 29.4858 6.53829 26.7893 4.93922C25.0702 3.91982 23.1375 4.29103 23.1375 4.29103C23.1375 4.29103 21.2793 2.52055 18.0295 3.12625C12.7274 4.1148 8.754 9.15108 8.754 16.1103C8.754 18.4141 9.104 20.5346 9.89012 23.6803C9.95481 23.9394 10.2026 24.0945 10.437 24.013C11.5756 23.6174 13.1161 23.3906 15.0396 23.208C14.9698 23.7894 14.8925 24.4412 14.8164 25.1022C13.7704 25.8411 9.33087 26.7456 7.63213 28.5021C5.90819 30.2854 5 37 5 37H20H35C35 37 34.0918 30.2854 32.3679 28.5021ZM16.5128 25.5123C16.5538 25.1543 16.8736 22.2203 16.8736 22.2203C15.2999 20.6867 14.6248 18.7751 14.3384 17.1001C14.1553 16.0304 14.1801 15.0346 14.2358 14.3729C17.2369 13.2022 21.4886 10.8189 23.133 8.77207C23.133 8.77207 23.3331 8.78116 23.2064 9.0833C22.9909 9.59687 22.6761 10.2035 22.2384 10.9244C23.0139 12.5536 24.4093 13.7458 25.7859 14.5917C25.8273 15.2311 25.8272 16.1163 25.6616 17.1001C25.3304 19.0682 23.8986 21.8158 22.3239 22.7796C21.2481 23.4381 19.278 23.5425 18.1291 23.0519C18.3938 23.5711 18.9248 24.1881 20.1008 24.4781C21.6854 24.8685 23.1333 24.2278 23.5067 24.0132C23.5765 24.5047 23.6415 24.997 23.6871 25.4222C23.7157 25.6898 23.7859 26.3456 25.6414 27.2031C24.1918 29.693 21.0168 31.03 20.0314 31.3965C19.1024 31.0022 16.1919 29.615 14.7857 27.1922C16.5866 26.4543 16.4814 25.7864 16.5128 25.5123Z',

          // id: 5
          'M32.3679 28.0453C31.6474 27.26 30.1855 26.0929 28.7234 24.9966C24.7169 30.492 19.4063 33.4193 12.9463 34.4094C12.5441 34.471 12.5772 34.2608 12.5772 34.2608C17.6019 32.5464 23.6716 29.5003 26.2612 24.8491C27.7836 22.1148 28.75 18.5104 28.75 14.8342C28.75 8.47218 24.8324 4 20 4C15.1676 4 11.25 8.47218 11.25 14.8342C11.25 21.2992 14.1839 27.5735 18.1046 29.1481C18.0859 29.251 17.968 29.2685 17.8027 29.2364C15.1958 28.7313 13.1883 26.847 11.6208 24.7397C10.0487 25.907 8.40925 27.1982 7.63213 28.0452C5.90819 29.9241 5 37 5 37H35C35 37 34.0918 29.9241 32.3679 28.0453ZM14.4041 13.1135C14.4041 13.1135 16.2512 11.9698 20.0003 11.9698C23.7487 11.9698 25.5961 13.1135 25.5961 13.1135C25.5961 13.1135 25.9673 15.4194 25.4518 18.4739C25.0629 20.7804 23.3073 24.6717 20.0003 24.6717C16.6929 24.6717 14.9374 20.7804 14.5483 18.4739C14.0331 15.4194 14.4041 13.1135 14.4041 13.1135Z',

          // id: 6
          'M32.36 28.1299C31.04 26.6915 27.32 25.4928 25.58 24.9534C25.58 24.9534 25.1 22.9756 25.04 22.9756C26.96 21.8968 28.4 18.5406 28.52 14.5251C28.58 13.3863 28.34 5.47515 22.58 4.09669C22.58 4.09669 23.6 5.23542 23.42 6.07448C23.42 6.07448 22.52 3.67716 18.08 4.03676C13.58 4.39636 9.2 9.25094 9.2 16.0234C9.2 18.2409 9.56 19.7392 10.28 22.7359C10.34 22.9756 10.58 23.1554 10.82 23.0356C12.14 22.4962 13.34 22.3164 15.44 21.4174C15.38 21.9568 15.14 24.0544 15.02 24.7137C14.96 24.7736 14.54 24.8336 14.54 24.8336C12.8 25.373 8.96 26.6316 7.64 28.07C5.9 29.9878 5 37 5 37H35C35 37 34.1 29.9878 32.36 28.1299ZM23.9 25.8524C24.1337 29.8209 16.0681 29.802 16.52 25.8524C16.64 24.7137 16.52 25.5528 17 22.616C15.62 21.2975 14.54 19.6793 14.54 17.7615C13.58 17.4618 13.34 16.2631 13.34 15.484C13.34 14.7049 13.52 14.2853 13.82 14.1655C14.06 14.0456 14.3 14.1655 14.42 14.2254C14.48 14.6449 14.54 14.8847 14.6 15.0045C14.72 15.5439 15.2 15.484 15.2 15.484V13.2065C16.82 12.787 17.9 12.1277 17.9 12.1277C17.78 13.2065 17.12 14.4651 17.12 14.4651C20.06 14.1055 21.92 11.0489 21.92 11.0489C22.28 12.5473 23.24 13.5661 23.24 13.5661C23.6 12.8469 24.02 12.3675 24.32 12.1277L24.68 11.5883L24.86 11.7082V15.484C24.86 15.484 25.34 15.5439 25.46 15.0045C25.46 14.8847 25.52 14.585 25.64 14.2254C25.76 14.1655 26 14.0456 26.24 14.1655C26.54 14.2853 26.72 14.7049 26.72 15.484C26.72 16.2631 26.48 17.4618 25.52 17.7615C25.52 19.979 24.02 21.6571 22.34 23.0955C21.74 23.4551 20.9 23.7548 20 23.7548C19.34 23.7548 18.74 23.575 18.26 23.3952C18.62 23.9346 19.28 24.6538 20.42 24.9534C22.34 25.4329 23.72 24.414 23.72 24.414C23.72 24.414 23.9 25.5528 23.9 25.8524Z',
        ])
      ),
    []
  );

  return shapes;
}
