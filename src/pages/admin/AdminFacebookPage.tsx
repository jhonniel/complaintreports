import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  FacebookConnectionStatus,
  FacebookIntakeItem,
  FacebookIntakeKind,
  FacebookIntakeStatus,
  FacebookPostPreview,
} from '@shared/facebookIntake'
import {
  FACEBOOK_INTAKE_STATUS_LABELS,
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
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { FacebookConvertModal } from '@/features/admin/FacebookConvertModal'
import { fetchAdminCategories } from '@/features/admin/catalogApi'
import {
  dismissFacebookIntake,
  fetchFacebookComments,
  fetchFacebookIntakes,
  fetchFacebookPagePosts,
  fetchFacebookStatus,
  importFacebookIntake,
  lookupFacebookPost,
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
  onSave,
  onComments,
}: {
  item: FacebookPostPreview
  saving: boolean
  onSave: (item: FacebookPostPreview) => void
  onComments?: (item: FacebookPostPreview) => void
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
        <Button size="sm" onClick={() => onSave(item)} loading={saving}>
          Save
        </Button>
        {item.kind === 'post' && onComments ? (
          <Button size="sm" variant="outline" onClick={() => onComments(item)}>
            Load comments
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
  const [error, setError] = useState<string | null>(null)

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
    void fetchFacebookStatus()
      .then(setStatus)
      .catch(() => setStatus({ configured: false, page_configured: false }))
    void fetchAdminCategories()
      .then((result) => setCategories(result.categories))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    void loadIntakes()
  }, [loadIntakes])

  function previewKey(item: FacebookPostPreview) {
    return `${item.facebook_post_id}:${item.facebook_comment_id ?? ''}`
  }

  async function savePreview(item: FacebookPostPreview) {
    setSavingKey(previewKey(item))
    try {
      const parsed = facebookImportSchema.safeParse({
        ...item,
        permalink: normalizeFacebookPermalink(item.permalink),
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
    setLookingUp(true)
    try {
      const result = await lookupFacebookPost(lookupUrl)
      setPreviews((current) => {
        const next = current.filter((item) => previewKey(item) !== previewKey(result.post))
        return [result.post, ...next]
      })
      toast({ variant: 'success', title: 'Post loaded', description: 'Save it, or load comments about this problem.' })
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
        toast({
          variant: 'error',
          title: 'Could not save',
          description: Object.values(fieldErrors(parsed.error))[0] ?? 'Check the link and message, then try again.',
        })
        return
      }
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Facebook intake</h1>
        <p className="mt-1 text-sm text-ink-500">
          Pull public Page posts and comments about city problems into Tingog. Private Messenger chats are not
          imported.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <p>
            Graph API token:{' '}
            <strong>{status?.configured ? 'Connected' : 'Not connected'}</strong>
          </p>
          <p>
            City Page ID: <strong>{status?.page_configured ? 'Set' : 'Not set'}</strong>
          </p>
          <p className="text-ink-500">
            Add a Page access token and Page ID on the server as <code>FACEBOOK_ACCESS_TOKEN</code> and{' '}
            <code>FACEBOOK_PAGE_ID</code>. Until then, paste a post link and the text below.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Load from Facebook</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field id="facebook-url" label="Post link or ID" hint="Public posts from the city Page work best.">
              <Input
                value={lookupUrl}
                onChange={(event) => setLookupUrl(event.target.value)}
                placeholder="https://www.facebook.com/..."
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void lookup()} loading={lookingUp} disabled={!lookupUrl.trim()}>
                Look up post
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
                    onSave={(preview) => void savePreview(preview)}
                    onComments={(preview) => void loadComments(preview)}
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
            <Field id="paste-url" label="Facebook link" required>
              <Input
                value={pasteUrl}
                onChange={(event) => setPasteUrl(event.target.value)}
                placeholder="https://www.facebook.com/..."
              />
            </Field>
            <Field id="paste-author" label="Author name" required>
              <Input value={pasteAuthor} onChange={(event) => setPasteAuthor(event.target.value)} />
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
            <Field id="paste-message" label="Copied text" required>
              <Textarea
                value={pasteMessage}
                onChange={(event) => setPasteMessage(event.target.value)}
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
              description="Look up a public Page post, load comments, or paste the text to start a ticket."
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
