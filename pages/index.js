import React, {useEffect} from 'react'
import {
  Box,
  Icon,
  PopoverTrigger,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import {useQuery, useQueryClient} from 'react-query'
import {Page, PageTitle} from '../screens/app/components'
import {
  UserInlineCard,
  SimpleUserStat,
  UserStatList,
  UserStat,
  UserStatLabel,
  UserStatValue,
  AnnotatedUserStat,
  ActivateInviteForm,
  ValidationResultToast,
  ActivateMiningForm,
  KillForm,
} from '../screens/profile/components'
import Layout from '../shared/components/layout'
import {IdentityStatus, OnboardingStep} from '../shared/types'
import {
  toPercent,
  toLocaleDna,
  mapIdentityToFriendlyStatus,
  eitherState,
} from '../shared/utils/utils'
import {hasPersistedValidationResults} from '../screens/validation/utils'
import {IconLink} from '../shared/components/link'
import {useIdentity} from '../shared/providers/identity-context'
import {useEpoch} from '../shared/providers/epoch-context'
import {fetchBalance} from '../shared/api/wallet'
import {useAuthState} from '../shared/providers/auth-context'
import {IconButton2, PrimaryButton} from '../shared/components/button'
import {validDnaUrl} from '../shared/utils/dna-link'
import {DnaSignInDialog} from '../screens/dna/containers'
import {FillCenter, Toast} from '../shared/components/components'
import {useOnboarding} from '../shared/providers/onboarding-context'
import {
  activeShowingOnboardingStep,
  doneOnboardingStep,
  onboardingStep,
  shouldCompleteOnboardingStep,
  shouldTransitionToCreateFlipsStep,
} from '../shared/utils/onboarding'
import {
  OnboardingPopover,
  OnboardingPopoverContent,
  OnboardingPopoverContentIconRow,
  TaskConfetti,
} from '../shared/components/onboarding'

export default function ProfilePage() {
  const queryClient = useQueryClient()

  const {
    t,
    i18n: {language},
  } = useTranslation()

  const [
    {
      address,
      state,
      penalty,
      age,
      totalShortFlipPoints,
      totalQualifiedFlips,
      online,
      delegatee,
      delegationEpoch,
      canMine,
      isValidated,
      requiredFlips,
      flips,
      canInvite,
    },
  ] = useIdentity()

  const epoch = useEpoch()
  const {coinbase, privateKey} = useAuthState()

  const [showValidationResults, setShowValidationResults] = React.useState()

  const {
    isOpen: isOpenKillForm,
    onOpen: onOpenKillForm,
    onClose: onCloseKillForm,
  } = useDisclosure()

  const {
    data: {balance, stake},
  } = useQuery(['get-balance', address], () => fetchBalance(address), {
    initialData: {balance: 0, stake: 0},
    enabled: !!address,
    refetchInterval: 30 * 1000,
  })

  useEffect(() => {
    if (epoch) {
      const {epoch: epochNumber} = epoch
      if (epochNumber) {
        queryClient.invalidateQueries('get-balance')
        setShowValidationResults(hasPersistedValidationResults(epochNumber))
      }
    }
  }, [epoch, queryClient])

  const {
    isOpen: isOpenDnaSignInDialog,
    onOpen: onOpenDnaSignInDialog,
    onClose: onCloseDnaSignInDialog,
  } = useDisclosure()

  const [dnaUrl, setDnaUrl] = React.useState(() =>
    typeof window !== 'undefined'
      ? JSON.parse(sessionStorage.getItem('dnaUrl'))
      : null
  )

  React.useEffect(() => {
    if (dnaUrl && validDnaUrl(dnaUrl.route)) {
      onOpenDnaSignInDialog()
    } else {
      sessionStorage.removeItem('dnaUrl')
      onCloseDnaSignInDialog()
    }
  }, [dnaUrl, onCloseDnaSignInDialog, onOpenDnaSignInDialog])

  const toast = useToast()

  const toDna = toLocaleDna(language)

  const [
    currentOnboarding,
    {
      done: doneStep,
      dismiss: dismissStep,
      finish: finishOnboarding,
      rollback: rollbackStep,
    },
  ] = useOnboarding()

  React.useEffect(() => {
    if (
      state === IdentityStatus.Candidate &&
      shouldCompleteOnboardingStep(
        currentOnboarding,
        OnboardingStep.ActivateInvite
      )
    ) {
      doneStep()
    }
  }, [currentOnboarding, doneStep, state])

  React.useEffect(() => {
    if (
      isValidated &&
      shouldCompleteOnboardingStep(currentOnboarding, OnboardingStep.Validate)
    ) {
      doneStep()
    }
  }, [currentOnboarding, doneStep, isValidated])

  React.useEffect(() => {
    if (
      !isValidated &&
      age > 0 &&
      eitherState(currentOnboarding, onboardingStep(OnboardingStep.Validate))
    ) {
      rollbackStep()
    }
  }, [age, currentOnboarding, isValidated, rollbackStep])

  React.useEffect(() => {
    if (
      online &&
      shouldCompleteOnboardingStep(
        currentOnboarding,
        OnboardingStep.ActivateMining
      )
    ) {
      if (
        shouldTransitionToCreateFlipsStep({isValidated, requiredFlips, flips})
      )
        doneStep()
      else finishOnboarding()
    }
  }, [
    currentOnboarding,
    doneStep,
    finishOnboarding,
    flips,
    isValidated,
    online,
    requiredFlips,
  ])

  const isShowingActivateMiningPopover = currentOnboarding.matches(
    activeShowingOnboardingStep(OnboardingStep.ActivateMining)
  )

  const isShowingActivateInvitePopover = currentOnboarding.matches(
    activeShowingOnboardingStep(OnboardingStep.ActivateInvite)
  )

  const {
    isOpen: isOpenActivateInvitePopover,
    onOpen: onOpenActivateInvitePopover,
    onClose: onCloseActivateInvitePopover,
  } = useDisclosure()

  React.useEffect(() => {
    if (isShowingActivateInvitePopover) {
      document
        .querySelectorAll('#__next section')[1]
        .querySelector('div')
        .scroll({
          left: 0,
          top: 9999,
        })
      onOpenActivateInvitePopover()
    } else onCloseActivateInvitePopover()
  }, [
    isShowingActivateInvitePopover,
    onCloseActivateInvitePopover,
    onOpenActivateInvitePopover,
  ])

  return (
    <Layout canRedirect={!dnaUrl}>
      <Page>
        <PageTitle mb={8}>{t('Profile')}</PageTitle>
        <Stack isInline spacing={10}>
          <Stack spacing={6}>
            <UserInlineCard address={coinbase} state={state} h={24} />
            <UserStatList>
              <SimpleUserStat label={t('Address')} value={coinbase} />
              {state === IdentityStatus.Newbie ? (
                <AnnotatedUserStat
                  annotation={t('Solve more than 12 flips to become Verified')}
                  label={t('Status')}
                  value={mapIdentityToFriendlyStatus(state)}
                />
              ) : (
                <SimpleUserStat
                  label={t('Status')}
                  value={mapIdentityToFriendlyStatus(state)}
                />
              )}
              <UserStat>
                <UserStatLabel>{t('Balance')}</UserStatLabel>
                <UserStatValue>{toDna(balance)}</UserStatValue>
              </UserStat>
              {stake > 0 && state === IdentityStatus.Newbie && (
                <Stack spacing={4}>
                  <AnnotatedUserStat
                    annotation={t(
                      'You need to get Verified status to be able to terminate your identity and withdraw the stake'
                    )}
                    label={t('Stake')}
                    value={toDna(stake * 0.25)}
                  />
                  <AnnotatedUserStat
                    annotation={t(
                      'You need to get Verified status to get the locked funds into the normal wallet'
                    )}
                    label={t('Locked')}
                    value={toDna(stake * 0.75)}
                  />
                </Stack>
              )}

              {stake > 0 && state !== IdentityStatus.Newbie && (
                <AnnotatedUserStat
                  annotation={t(
                    'In order to withdraw the stake you have to terminate your identity'
                  )}
                  label={t('Stake')}
                  value={toDna(stake)}
                />
              )}

              {penalty > 0 && (
                <AnnotatedUserStat
                  annotation={t(
                    "Your node was offline more than 1 hour. The penalty will be charged automaically. Once it's fully paid you'll continue to mine coins."
                  )}
                  label={t('Mining penalty')}
                  value={toDna(penalty)}
                />
              )}

              {age >= 0 && <SimpleUserStat label="Age" value={age} />}

              {epoch && (
                <SimpleUserStat
                  label={t('Next validation')}
                  value={new Date(epoch.nextValidation).toLocaleString()}
                />
              )}

              {totalQualifiedFlips > 0 && (
                <AnnotatedUserStat
                  annotation={t('Total score for all validations')}
                  label={t('Total score')}
                >
                  <UserStatValue>
                    {totalShortFlipPoints} out of {totalQualifiedFlips} (
                    {toPercent(totalShortFlipPoints / totalQualifiedFlips)})
                  </UserStatValue>
                </AnnotatedUserStat>
              )}
            </UserStatList>

            <OnboardingPopover
              isOpen={isOpenActivateInvitePopover}
              placement="top-start"
            >
              <PopoverTrigger>
                <ActivateInviteForm zIndex={2} />
              </PopoverTrigger>
              <OnboardingPopoverContent
                title={t('Enter invitation code')}
                zIndex={2}
                onDismiss={() => {
                  dismissStep()
                  onCloseActivateInvitePopover()
                }}
              >
                <Stack spacing={5}>
                  <Stack>
                    <Text>
                      {t(
                        `An invitation can be provided by validated participants.`
                      )}
                    </Text>
                    <Text>
                      {t(`Join the official Idena public Telegram group and follow instructions in the
                pinned message.`)}
                    </Text>
                    <OnboardingPopoverContentIconRow icon="telegram">
                      <Box>
                        <PrimaryButton
                          variant="unstyled"
                          p={0}
                          onClick={() => {
                            global.openExternal(
                              'https://t.me/IdenaNetworkPublic'
                            )
                          }}
                        >
                          https://t.me/IdenaNetworkPublic
                        </PrimaryButton>
                        <Text fontSize="sm" color="rgba(255, 255, 255, 0.56)">
                          {t('Official group')}
                        </Text>
                      </Box>
                    </OnboardingPopoverContentIconRow>
                  </Stack>
                </Stack>
              </OnboardingPopoverContent>
            </OnboardingPopover>
            <FillCenter position="absolute" top="50%" left="50%" zIndex={9999}>
              <TaskConfetti
                active={
                  eitherState(
                    currentOnboarding,
                    `${doneOnboardingStep(OnboardingStep.ActivateInvite)}.salut`
                  ) ||
                  (eitherState(
                    currentOnboarding,
                    `${doneOnboardingStep(OnboardingStep.Validate)}.salut`
                  ) &&
                    state === IdentityStatus.Newbie)
                }
              />
            </FillCenter>
          </Stack>
          <Stack spacing={10} w={48}>
            <Box minH={62} mt={4}>
              <OnboardingPopover isOpen={isShowingActivateMiningPopover}>
                <PopoverTrigger>
                  <Box
                    bg="white"
                    position={
                      isShowingActivateMiningPopover ? 'relative' : 'initial'
                    }
                    borderRadius="md"
                    p={2}
                    m={-2}
                    zIndex={2}
                  >
                    {address && privateKey && canMine && (
                      <ActivateMiningForm
                        privateKey={privateKey}
                        isOnline={online}
                        delegatee={delegatee}
                        delegationEpoch={delegationEpoch}
                        onShow={() => {
                          if (
                            shouldTransitionToCreateFlipsStep({
                              isValidated,
                              requiredFlips,
                              flips,
                            })
                          )
                            doneStep()
                          else finishOnboarding()
                        }}
                      />
                    )}
                  </Box>
                </PopoverTrigger>
                <OnboardingPopoverContent
                  title={t('Activate mining status')}
                  onDismiss={() => {
                    if (
                      shouldTransitionToCreateFlipsStep({
                        isValidated,
                        requiredFlips,
                        flips,
                      })
                    )
                      doneStep()
                    else finishOnboarding()
                  }}
                >
                  <Text>
                    {t(
                      `To become a validator of Idena blockchain you can activate your mining status. Keep your node online to mine iDNA coins.`
                    )}
                  </Text>
                </OnboardingPopoverContent>
              </OnboardingPopover>
            </Box>
            <Stack spacing={1} align="flex-start">
              <IconLink href="/flips/new" icon={<Icon name="photo" size={5} />}>
                {t('New flip')}
              </IconLink>
              <IconLink
                href="/contacts?new"
                isDisabled={!canInvite}
                icon={<Icon name="add-user" size={5} />}
              >
                {t('Invite')}
              </IconLink>
              <IconButton2
                isDisabled={!true}
                icon="delete"
                onClick={onOpenKillForm}
              >
                {t('Terminate')}
              </IconButton2>
            </Stack>
          </Stack>
        </Stack>
        <KillForm isOpen={isOpenKillForm} onClose={onCloseKillForm}></KillForm>

        {showValidationResults && <ValidationResultToast epoch={epoch.epoch} />}

        {dnaUrl && (
          <DnaSignInDialog
            isOpen={isOpenDnaSignInDialog}
            query={dnaUrl?.query}
            onDone={() => setDnaUrl('')}
            onError={error =>
              toast({
                status: 'error',
                // eslint-disable-next-line react/display-name
                render: () => <Toast status="error" title={error} />,
              })
            }
            onClose={onCloseDnaSignInDialog}
          />
        )}
      </Page>
    </Layout>
  )
}
