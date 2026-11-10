<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Storefront presentation
- Checkout plan purchases reuse membership cycles, payments and the immutable credit ledger: reserve the first eligible delivery before payment, unlock subsequent credits only after confirmed payment, and decide fee waivers atomically under a per-customer lock.
- GharBudget uses a pure, tested priority-allocation engine invoked by server functions against current catalog and editable consumption/quality tables; existing checkout remains the final price and stock authority.
- The shared HeroCarousel owns the photography and accessible rotation controls; the homepage supplies its overlay content as children so presentation does not duplicate carousel behavior.
- Storefront colors and photo overlays use semantic tokens in src/styles.css so dark and light themes stay consistent.
