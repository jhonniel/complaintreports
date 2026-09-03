import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type {
  FacebookConnectionStatus,
  FacebookIntakeItem,
  FacebookIntakeKind,
  FacebookIntakeStatus,
  FacebookPageOption,
  FacebookPostPreview,
} from '@shared/facebookIntake'
import {
  FACEBOOK_INTAKE_STATUS_LABELS,
  displayFacebookMessage,
  fallbackFacebookIds,
  facebookImportSchema,
  normalizeFacebookPermalink,
} from '@shared/facebookIntake'
import { fieldErrors } from '@shared/report'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { FacebookConvertModal } from '@/features/admin/FacebookConvertModal'
import { fetchAdminCategories } from '@/features/admin/catalogApi'
import {
  completeFacebookOAuth,
  disconnectFacebook,
  dismissFacebookIntake,
  fetchFacebookComments,
  fetchFacebookIntakes,
  fetchFacebookPagePosts,
  fetchFacebookStatus,
  importFacebookComments,
  importFacebookIntake,
  lookupFacebookPost,
  selectFacebookPage,
  startFacebookOAuth,
} from '@/features/admin/facebookApi'
import { ApiError } from '@/services/api'
import { formatDateTime } from '@/utils/format'
import { Share2 } from 'lucide-react'

type StatusFilter = 'all' | FacebookIntakeStatus

function statusBadge(status: FacebookIntakeStatus) {
  if (status === 'converted') return 'success'
  if (status === 'dismissed') return 'default'
  return 'info'
}

function PreviewCard({
  item,
  saving,
  importing,
  onSave,
  onComments,
  onImportComments,
}: {
  item: FacebookPostPreview
  saving: boolean
  importing?: boolean
  onSave: (item: FacebookPostPreview) => void
  onComments?: (item: FacebookPostPreview) => void
  onImportComments?: (item: FacebookPostPreview) => void
}) {
  return (
    <article className="rounded-lg border border-ink-100 bg-ink-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={item.kind === 'comment' ? 'earth' : 'pine'}>{item.kind}</Badge>
        <p className="text-sm font-medium text-ink-800">{item.author_name}</p>
        {item.posted_at ? <p className="text-xs text-ink-500">{formatDateTime(item.posted_at)}</p> : null}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{item.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.kind === 'post' && onImportComments ? (
          <Button size="sm" onClick={() => onImportComments(item)} loading={importing}>
            Import comments as reports
          </Button>
        ) : (
          <Button size="sm" onClick={() => onSave(item)} loading={saving}>
            Save
          </Button>
        )}
        {item.kind === 'post' && onComments ? (
          <Button size="sm" variant="outline" onClick={() => onComments(item)}>
            Show comments
          </Button>
        ) : null}
        <a
          href={item.permalink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center px-3 text-sm font-medium text-pine-800 hover:underline"
        >
          Open on Facebook
        </a>
      </div>
    </article>
  )
}

export function AdminFacebookPage() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<FacebookConnectionStatus | null>(null)
  const [lookupUrl, setLookupUrl] = useState('')
  const [pasteUrl, setPasteUrl] = useState('')
  const [pasteAuthor, setPasteAuthor] = useState('')
  const [pasteMessage, setPasteMessage] = useState('')
  const [pasteKind, setPasteKind] = useState<FacebookIntakeKind>('post')
  const [previews, setPreviews] = useState<FacebookPostPreview[]>([])
  const [comments, setComments] = useState<FacebookPostPreview[]>([])
  const [commentPostId, setCommentPostId] = useState<string | null>(null)
  const [intakes, setIntakes] = useState<FacebookIntakeItem[]>([])
  const [filter, setFilter] = useState<StatusFilter>('new')
  const [categories, setCategories] = useState<{ id: string; name: string; is_active: boolean }[]>([])
  const [converting, setConverting] = useState<FacebookIntakeItem | null>(null)
  const [loadingIntakes, setLoadingIntakes] = useState(true)
  const [lookingUp, setLookingUp] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [pasting, setPasting] = useState(false)
  const [pasteErrors, setPasteErrors] = useState<Record<string, string>>({})
  const [importingKey, setImportingKey] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [pageChoices, setPageChoices] = useState<FacebookPageOption[]>([])
  const [oauthSessionId, setOauthSessionId] = useState<string | null>(null)
  const [pickingPageId, setPickingPageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await fetchFacebookStatus())
    } catch {
      setStatus({
        oauth_ready: false,
        configured: false,
        page_configured: false,
        page_id: null,
        page_name: null,
        source: null,
      })
    }
  }, [])

  const loadIntakes = useCallback(async () => {
    setLoadingIntakes(true)
    setError(null)
    try {
      const result = await fetchFacebookIntakes(filter)
      setIntakes(result.intakes)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load saved Facebook items.')
    } finally {
      setLoadingIntakes(false)
    }
  }, [filter])

  useEffect(() => {
    void loadStatus()
    void fetchAdminCategories()
      .then((result) => setCategories(result.categories))
      .catch(() => setCategories([]))
  }, [loadStatus])

  useEffect(() => {
    void loadIntakes()
  }, [loadIntakes])

  useEffect(() => {
    const error = searchParams.get('error_description') || searchParams.get('error')
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (!error && !code && !state) return
    setSearchParams({}, { replace: true })
    if (error) {
      toast({
        variant: 'error',
        title: 'Facebook login cancelled',
        description: error.replace(/\+/g, ' '),
      })
      return
    }
    if (!code || !state) return
    setConnecting(true)
    void completeFacebookOAuth(code, state)
      .then(async (result) => {
        if (result.connected) {
          await loadStatus()
          toast({
            variant: 'success',
            title: 'Facebook Page connected',
            description: result.page ? `Using ${result.page.page_name}.` : 'The Page is ready to import posts.',
          })
          return
        }
        setOauthSessionId(result.session_id)
        setPageChoices(result.pages)
      })
      .catch((caught) => {
        toast({
          variant: 'error',
          title: 'Could not connect Facebook',
          description: caught instanceof ApiError ? caught.message : 'Try connecting again.',
        })
      })
      .finally(() => setConnecting(false))
  }, [loadStatus, searchParams, setSearchParams, toast])

  function previewKey(item: FacebookPostPreview) {
    return `${item.facebook_post_id}:${item.facebook_comment_id ?? ''}`
  }

  async function savePreview(item: FacebookPostPreview) {
    setSavingKey(previewKey(item))
    try {
      const parsed = facebookImportSchema.safeParse({
        ...item,
        permalink: normalizeFacebookPermalink(item.permalink),
        message: displayFacebookMessage(item.message, item.kind),
      })
      if (!parsed.success) {
        toast({
          variant: 'error',
          title: 'Could not save',
          description: Object.values(fieldErrors(parsed.error))[0] ?? 'Check the post and try again.',
        })
        return
      }
      await importFacebookIntake(parsed.data)
      toast({ variant: 'success', title: 'Saved', description: 'This Facebook item is ready to convert into a ticket.' })
      await loadIntakes()
    } catch (caught) {
      toast({
        title: 'Could not save',
        description: caught instanceof ApiError ? caught.message : 'Check the post and try again.',
        variant: 'error',
      })
    } finally {
      setSavingKey(null)
    }
  }

  async function lookup() {
    if (!status?.configured) {
      toast({
        variant: 'error',
        title: 'Facebook is not connected',
        description:
          'A photo link is not enough. Connect the city Page first, then look up this link to extract comments.',
      })
      return
    }
    setLookingUp(true)
    try {
      const result = await lookupFacebookPost(lookupUrl)
      setPreviews((current) => {
        const next = current.filter((item) => previewKey(item) !== previewKey(result.post))
        return [result.post, ...next]
      })
      setCommentPostId(result.post.facebook_post_id)
      setComments(result.comments)
      toast({
        variant: result.comments.length > 0 ? 'success' : 'info',
        title: result.comments.length > 0 ? 'Comments loaded' : 'Post loaded',
        description:
          result.comments.length > 0
            ? `${result.comments.length} comment${result.comments.length === 1 ? '' : 's'} extracted from this photo or post.`
            : 'Facebook returned this item but no comments. Connect the Page that published it, then try Import comments as reports.',
      })
    } catch (caught) {
      toast({
        title: 'Could not load that post',
        description: caught instanceof ApiError ? caught.message : 'Paste the text below instead.',
        variant: 'error',
      })
    } finally {
      setLookingUp(false)
    }
  }

  async function loadPagePosts() {
    if (!status?.configured) {
      toast({
        variant: 'error',
        title: 'Facebook is not connected',
        description: 'Connect the city Page first, then load recent posts.',
      })
      return
    }
    setLoadingPosts(true)
    try {
      const result = await fetchFacebookPagePosts()
      setPreviews(result.posts)
      if (result.posts.length === 0) {
        toast({ variant: 'info', title: 'No posts found', description: 'The city Page has no recent text posts.' })
      }
    } catch (caught) {
      toast({
        title: 'Could not load Page posts',
        description: caught instanceof ApiError ? caught.message : 'Connect Facebook on the server first.',
        variant: 'error',
      })
    } finally {
      setLoadingPosts(false)
    }
  }

  async function importComments(item: FacebookPostPreview) {
    if (!status?.configured) {
      toast({
        variant: 'error',
        title: 'Facebook is not connected',
        description:
          'Connect the city Page first. Facebook will not return comments from a pasted link until a Page token exists.',
      })
      return
    }
    const key = item.facebook_post_id ? previewKey(item) : `url:${item.permalink}`
    setImportingKey(key)
    try {
      const other = categories.find((category) => category.is_active && category.name === 'Other')
      const fallback = categories.find((category) => category.is_active)
      const result = await importFacebookComments({
        post_id: item.facebook_post_id || undefined,
        url: item.permalink || lookupUrl,
        category_id: other?.id ?? fallback?.id,
        include_post: true,
      })
      setComments(
        result.intakes
          .filter((intake) => intake.kind === 'comment')
          .map((intake) => ({
            facebook_post_id: intake.facebook_post_id,
            facebook_comment_id: intake.facebook_comment_id,
            permalink: intake.permalink,
            author_name: intake.author_name,
            message: intake.message,
            posted_at: intake.posted_at,
            kind: intake.kind,
          })),
      )
      setCommentPostId(result.post.facebook_post_id)
      setPreviews((current) => {
        const next = current.filter((preview) => preview.facebook_post_id !== result.post.facebook_post_id)
        return [result.post, ...next]
      })
      toast({
        variant: 'success',
        title: 'Comments imported',
        description:
          result.created > 0
            ? `${result.created} ticket${result.created === 1 ? '' : 's'} added to Reports${result.skipped ? `. ${result.skipped} already imported.` : '.'}`
            : result.skipped
              ? 'Those comments are already in Reports.'
              : 'No public comments were found on that post.',
      })
      await loadIntakes()
    } catch (caught) {
      toast({
        title: 'Could not import comments',
        description: caught instanceof ApiError ? caught.message : 'Connect Facebook and try again.',
        variant: 'error',
      })
    } finally {
      setImportingKey(null)
    }
  }

  async function loadComments(item: FacebookPostPreview) {
    setLoadingComments(true)
    setCommentPostId(item.facebook_post_id)
    try {
      const result = await fetchFacebookComments(item.facebook_post_id)
      setComments(result.comments)
      if (result.comments.length === 0) {
        toast({ variant: 'info', title: 'No comments', description: 'This post has no public comments to import.' })
      }
    } catch (caught) {
      toast({
        title: 'Could not load comments',
        description: caught instanceof ApiError ? caught.message : 'The Page token may not allow comments.',
        variant: 'error',
      })
    } finally {
      setLoadingComments(false)
    }
  }

  async function savePaste() {
    setPasting(true)
    try {
      const permalink = normalizeFacebookPermalink(pasteUrl)
      const ids = fallbackFacebookIds(permalink, pasteMessage, pasteKind)
      const parsed = facebookImportSchema.safeParse({
        ...ids,
        permalink,
        author_name: pasteAuthor.trim() || 'Facebook user',
        message: pasteMessage,
        posted_at: null,
        kind: pasteKind,
      })
      if (!parsed.success) {
        const errors = fieldErrors(parsed.error)
        setPasteErrors(errors)
        toast({
          variant: 'error',
          title: 'Could not save',
          description: errors.message || errors.permalink || errors.author_name || 'Check the link and copied text.',
        })
        return
      }
      setPasteErrors({})
      await importFacebookIntake(parsed.data)
      setPasteMessage('')
      toast({ variant: 'success', title: 'Saved', description: 'The pasted Facebook item is ready to convert.' })
      await loadIntakes()
    } catch (caught) {
      toast({
        title: 'Could not save',
        description: caught instanceof ApiError ? caught.message : 'Check the link and message, then try again.',
        variant: 'error',
      })
    } finally {
      setPasting(false)
    }
  }

  async function dismiss(item: FacebookIntakeItem) {
    if (!window.confirm('Dismiss this Facebook item? It will not become a ticket.')) return
    try {
      await dismissFacebookIntake(item.id)
      toast({ variant: 'success', title: 'Dismissed', description: 'This Facebook item will stay out of the new queue.' })
      await loadIntakes()
    } catch (caught) {
      toast({
        title: 'Could not dismiss',
        description: caught instanceof ApiError ? caught.message : 'Try again.',
        variant: 'error',
      })
    }
  }

  async function connectFacebook() {
    setConnecting(true)
    try {
      const result = await startFacebookOAuth()
      window.location.assign(result.url)
    } catch (caught) {
      setConnecting(false)
      toast({
        variant: 'error',
        title: 'Could not start Facebook login',
        description: caught instanceof ApiError ? caught.message : 'Add the Facebook app ID and secret, then try again.',
      })
    }
  }

  async function pickPage(pageId: string) {
    if (!oauthSessionId) return
    setPickingPageId(pageId)
    try {
      const result = await selectFacebookPage(oauthSessionId, pageId)
      setOauthSessionId(null)
      setPageChoices([])
      await loadStatus()
      toast({
        variant: 'success',
        title: 'Facebook Page connected',
        description: `Using ${result.page.page_name}.`,
      })
    } catch (caught) {
      toast({
        variant: 'error',
        title: 'Could not connect that Page',
        description: caught instanceof ApiError ? caught.message : 'Try again.',
      })
    } finally {
      setPickingPageId(null)
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect the Facebook Page? Staff can connect another Page after this.')) return
    try {
      await disconnectFacebook()
      await loadStatus()
      toast({ variant: 'success', title: 'Facebook disconnected' })
    } catch (caught) {
      toast({
        variant: 'error',
        title: 'Could not disconnect',
        description: caught instanceof ApiError ? caught.message : 'Try again.',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Facebook intake</h1>
        <p className="mt-1 text-sm text-ink-500">
          Paste a public Page post to import every comment as a ticket in Reports. Private Messenger chats are not
          imported.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          {status?.page_name ? (
            <p>
              Connected Page: <strong>{status.page_name}</strong>
            </p>
          ) : (
            <p>
              Facebook Page: <strong>{status?.configured ? 'Token set, no Page chosen' : 'Not connected'}</strong>
            </p>
          )}
          <p className="text-ink-500">
            Connect with Facebook, then pick the city Page you manage. Private Messenger is not imported.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void connectFacebook()} loading={connecting} disabled={!status?.oauth_ready}>
              {status?.configured ? 'Connect a different Page' : 'Connect Facebook'}
            </Button>
            {status?.source === 'oauth' ? (
              <Button variant="outline" onClick={() => void disconnect()}>
                Disconnect
              </Button>
            ) : null}
          </div>
          {!status?.oauth_ready ? (
            <p className="text-ink-500">
              Add <code>FACEBOOK_APP_ID</code> and <code>FACEBOOK_APP_SECRET</code> on the server so staff can pick a
              Page. In the Facebook app, add this site&apos;s <code>/admin/facebook</code> URL as a valid OAuth
              redirect.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Load from Facebook</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {!status?.configured ? (
              <div className="rounded-lg border border-earth-300 bg-earth-50 px-3 py-2 text-sm text-ink-800">
                Load from Facebook cannot open a link yet. The Page is not connected, so Look up and Import stay
                blocked. Add <code>FACEBOOK_APP_ID</code> and <code>FACEBOOK_APP_SECRET</code>, run the Facebook SQL
                in Supabase, then click Connect Facebook and pick the city Page.
              </div>
            ) : null}
            <Field
              id="facebook-url"
              label="Post link or ID"
              hint={
                status?.configured
                  ? 'Photo links, share links, and Page posts work if they were published by the connected Page.'
                  : 'This photo link is valid, but Facebook will not return comments until the city Page is connected.'
              }
            >
              <Input
                value={lookupUrl}
                onChange={(event) => setLookupUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void lookup()
                  }
                }}
                placeholder="https://www.facebook.com/photo/?fbid=..."
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void lookup()} loading={lookingUp} disabled={!lookupUrl.trim()}>
                Look up post
              </Button>
              <Button
                onClick={() =>
                  void importComments({
                    facebook_post_id: '',
                    facebook_comment_id: null,
                    permalink: lookupUrl,
                    author_name: 'Facebook user',
                    message: 'Facebook post',
                    posted_at: null,
                    kind: 'post',
                  })
                }
                loading={importingKey === `url:${lookupUrl}` || importingKey === `url:${lookupUrl.trim()}`}
                disabled={!lookupUrl.trim()}
              >
                Import comments as reports
              </Button>
              <Button variant="outline" onClick={() => void loadPagePosts()} loading={loadingPosts}>
                Load recent Page posts
              </Button>
            </div>
            {previews.length > 0 ? (
              <div className="space-y-3">
                {previews.map((item) => (
                  <PreviewCard
                    key={previewKey(item)}
                    item={item}
                    saving={savingKey === previewKey(item)}
                    importing={importingKey === previewKey(item)}
                    onSave={(preview) => void savePreview(preview)}
                    onComments={(preview) => void loadComments(preview)}
                    onImportComments={(preview) => void importComments(preview)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">Look up a post or load the city Page feed to start.</p>
            )}
            {commentPostId ? (
              <div className="space-y-3 border-t border-ink-100 pt-4">
                <h3 className="text-sm font-semibold text-ink-800">Comments about this post</h3>
                {loadingComments ? <Skeleton className="h-24" /> : null}
                {comments.length === 0 && !loadingComments ? (
                  <p className="text-sm text-ink-500">No comments loaded yet.</p>
                ) : null}
                {comments.map((item) => (
                  <PreviewCard
                    key={previewKey(item)}
                    item={item}
                    saving={savingKey === previewKey(item)}
                    onSave={(preview) => void savePreview(preview)}
                  />
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paste a post or comment</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field id="paste-url" label="Facebook link" required error={pasteErrors.permalink}>
              <Input
                value={pasteUrl}
                onChange={(event) => {
                  setPasteUrl(event.target.value)
                  setPasteErrors((current) => ({ ...current, permalink: '' }))
                }}
                placeholder="https://www.facebook.com/..."
              />
            </Field>
            <Field id="paste-author" label="Author name" required error={pasteErrors.author_name}>
              <Input
                value={pasteAuthor}
                onChange={(event) => {
                  setPasteAuthor(event.target.value)
                  setPasteErrors((current) => ({ ...current, author_name: '' }))
                }}
              />
            </Field>
            <Field id="paste-kind" label="Type">
              <Select
                value={pasteKind}
                onChange={(event) => setPasteKind(event.target.value as FacebookIntakeKind)}
              >
                <option value="post">Post</option>
                <option value="comment">Comment</option>
              </Select>
            </Field>
            <Field
              id="paste-message"
              label="Copied text"
              required
              error={pasteErrors.message}
              hint="Copy the post or comment text here. The Facebook link is not enough by itself."
            >
              <Textarea
                value={pasteMessage}
                onChange={(event) => {
                  setPasteMessage(event.target.value)
                  setPasteErrors((current) => ({ ...current, message: '' }))
                }}
                placeholder="Paste the public post or comment about the problem."
              />
            </Field>
            <Button onClick={() => void savePaste()} loading={pasting}>
              Save pasted item
            </Button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Saved Facebook items</CardTitle>
          <Select
            value={filter}
            onChange={(event) => setFilter(event.target.value as StatusFilter)}
            className="sm:w-48"
          >
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="converted">Ticket created</option>
            <option value="dismissed">Dismissed</option>
          </Select>
        </CardHeader>
        <CardBody className="p-0">
          {loadingIntakes ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : error ? (
            <p className="p-5 text-sm font-medium text-danger-600">{error}</p>
          ) : intakes.length === 0 ? (
            <EmptyState
              icon={<Share2 className="size-6" aria-hidden="true" />}
              title="No Facebook items yet"
              description="Import comments from a public Page post to create tickets in Reports."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Source</TH>
                  <TH>Message</TH>
                  <TH>Status</TH>
                  <TH>Saved</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {intakes.map((item) => (
                  <TR key={item.id}>
                    <TD>
                      <p className="font-medium">{item.author_name}</p>
                      <p className="text-xs uppercase tracking-wide text-ink-500">{item.kind}</p>
                    </TD>
                    <TD className="max-w-md">
                      <p className="line-clamp-3">{item.message}</p>
                    </TD>
                    <TD>
                      <Badge variant={statusBadge(item.status)}>
                        {FACEBOOK_INTAKE_STATUS_LABELS[item.status]}
                      </Badge>
                      {item.ticket_number ? (
                        <Link
                          to={`/admin/reports/${item.ticket_number}`}
                          className="mt-1 block text-xs font-medium text-pine-800 hover:underline"
                        >
                          {item.ticket_number}
                        </Link>
                      ) : null}
                    </TD>
                    <TD>
                      <p>{formatDateTime(item.created_at)}</p>
                      <p className="text-xs text-ink-500">{item.imported_by_name}</p>
                    </TD>
                    <TD>
                      {item.status === 'new' ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => setConverting(item)}>
                            Create ticket
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void dismiss(item)}>
                            Dismiss
                          </Button>
                        </div>
                      ) : (
                        <a
                          href={item.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-pine-800 hover:underline"
                        >
                          Open source
                        </a>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={pageChoices.length > 0}
        title="Choose a Facebook Page"
        description="Pick the city Page Tingog should read posts and comments from."
        onClose={() => {
          setPageChoices([])
          setOauthSessionId(null)
        }}
      >
        <ul className="space-y-2">
          {pageChoices.map((page) => (
            <li key={page.id}>
              <Button
                variant="outline"
                className="w-full justify-start"
                loading={pickingPageId === page.id}
                onClick={() => void pickPage(page.id)}
              >
                {page.name}
              </Button>
            </li>
          ))}
        </ul>
      </Modal>

      {converting ? (
        <FacebookConvertModal
          key={converting.id}
          intake={converting}
          categories={categories}
          onClose={() => setConverting(null)}
          onConverted={(intake) => {
            setConverting(null)
            setIntakes((current) => current.map((item) => (item.id === intake.id ? intake : item)))
            toast({
              variant: 'success',
              title: 'Ticket created',
              description: intake.ticket_number
                ? `${intake.ticket_number} is now in Reports.`
                : 'The Facebook item is now a ticket.',
            })
          }}
        />
      ) : null}
    </div>
  )
}
